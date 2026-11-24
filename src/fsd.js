import {
  angle,
  blockedByBuilding,
  clamp,
  dist,
  heading,
  nearestOnPath,
  pointAt,
  round,
} from "./math.js";
import {
  routeSpeedLimit,
  stopLineDistance,
  steeringForCurvature,
} from "./planning.js";
import { recoveryBlocked } from "./driving-plan.js";

const RECOVERY_DISTANCE_M = 6;
const STOP_LINE_MARGIN_M = 0.65;
const STOP_LINE_DECELERATION = 4.2;
const CURVE_LATERAL_ACCELERATION = 3.2;
const DESTINATION_MARGIN_M = 1;
const COMFORTABLE_ACCELERATION = 3.2;
const RECOVERY_SPEED = 2.2;
const HOLD_ROAD_SPEED = 4.5;

// Look far enough ahead to brake for a bend before entering it. A speed limit
// at the corner alone is too late at motorway speeds: the approach cap is the
// speed from which the car can still slow down over the remaining distance.
function curveSpeed(route, from, speed) {
  const step = 4;
  const horizon = clamp(
    (speed * speed) / (2 * STOP_LINE_DECELERATION) + 24,
    40,
    160,
  );
  let limit = Infinity;
  for (let ahead = step; ahead <= horizon; ahead += step) {
    const a = pointAt(route.points, from + ahead - step);
    const b = pointAt(route.points, from + ahead);
    const headingA = a.heading ?? route.points[0]?.heading ?? 0;
    const headingB = b.heading ?? headingA;
    const change = Math.abs(angle(headingB - headingA));
    if (change < 0.002) continue;
    const radius = Math.max(2.4, step / change);
    const corner = Math.sqrt(CURVE_LATERAL_ACCELERATION * radius) + 0.4;
    const room = Math.max(0, ahead - 3);
    limit = Math.min(
      limit,
      Math.sqrt(corner * corner + 2 * STOP_LINE_DECELERATION * room),
    );
  }
  return limit;
}

function signedOffset(car, near) {
  return (
    (car.x - near.x) * Math.cos(near.heading) +
    (car.z - near.z) * Math.sin(near.heading)
  );
}

/**
 * Local Full Self-Driving controller.
 *
 * It uses only observations already available in the simulation: the planned
 * route, the road/speed rules, and the observed traffic. No network request,
 * API key or model response is needed for the car to drive itself.
 *
 * If the car has left the route (a missed turn, a late engagement), it asks
 * the simulation to splice a new path through the next intersection and then
 * follows that path. It will not cut through buildings to rejoin a stale plan.
 */
export class FullSelfDriving {
  constructor(sim) {
    this.sim = sim;
    this.reset();
  }

  reset() {
    this.reason = "Starting";
    this.desiredSpeed = 0;
    this.stopDistance = null;
    this.recovering = false;
    this.decisions = 0;
    this.lastTarget = 0;
    this.lastTime = null;
  }

  snapshot() {
    return {
      mode: "fsd",
      decisions: this.decisions,
      desired_speed_mps: round(this.desiredSpeed, 2),
      target_speed_mps: round(this.lastTarget, 2),
      reason: this.reason,
      stop_line_ahead_m:
        this.stopDistance === null ? null : round(this.stopDistance, 2),
      recovering: this.recovering,
      requires_network: false,
    };
  }

  /** Called by Simulation.step on every physics tick. */
  update() {
    const sim = this.sim;
    const car = sim.player;
    const dt =
      this.lastTime === null
        ? 0.05
        : clamp(sim.time - this.lastTime, 1 / 120, 0.2);
    this.lastTime = sim.time;
    if (sim.complete || sim.crash || sim.freeExplore) {
      this.reason = sim.complete
        ? "Arrived"
        : sim.crash
          ? "Stopped"
          : "Free play";
      this.desiredSpeed = this.lastTarget = 0;
      return;
    }
    this.decisions++;

    let route = car.route;
    let near = nearestOnPath(car, route.points);
    const headingError = Math.abs(angle(near.heading - car.heading));
    // Missed the planned turn, or engaged while off the line: pick up at the
    // next intersection instead of diving through a block toward the old path.
    if (near.distance > 5.5 || headingError > 0.85) sim.forceReroute?.();
    route = car.route;
    near = nearestOnPath(car, route.points);

    const maneuver = { lane_offset_m: 0, lookahead_m: 6, stop_at_line: null };
    let target = Math.min(sim.world.theme.limit, routeSpeedLimit(car, near.s));
    this.stopDistance = null;
    this.recovering = false;
    this.reason = "Cruising";

    const speed = Math.abs(car.speed);
    maneuver.lookahead_m = clamp(3.8 + speed * 0.62, 4.5, 15);
    if (near.distance > 1.4) maneuver.lookahead_m = Math.max(4.2, maneuver.lookahead_m * 0.72);
    target = Math.min(target, curveSpeed(route, near.s, car.speed));

    const buildings = sim.world.objects.filter((o) => o.type === "building");
    const offRoute =
      near.distance > RECOVERY_DISTANCE_M ||
      Math.abs(angle(near.heading - car.heading)) > 1.15;

    if (offRoute) {
      this.recovering = true;
      const goalS = clamp(near.s + 8, 0, route.length);
      const goal = pointAt(route.points, goalS);
      const toGoal = heading(car, goal);
      const range = Math.max(2, dist(car, goal));
      const blocked = blockedByBuilding(car, goal, buildings);
      const obstacles = [...buildings, ...sim.traffic, ...sim.pedestrians];

      if (blocked || range > 28) {
        // Stay on the asphalt we are already on. The rerouter will splice a
        // legal path through the next junction; cutting a corner hits a wall.
        this.reason = "Holding the road";
        const laneHeading = near.heading;
        const keep = angle(laneHeading - car.heading);
        const pull = clamp(-signedOffset(car, near) * 0.18, -0.45, 0.45);
        maneuver.direct_steering = clamp(keep * 0.9 + pull, -0.7, 0.7);
        target = Math.min(Math.max(2.4, speed * 0.7), HOLD_ROAD_SPEED);
      } else {
        this.reason = "Returning to route";
        const headingToGoal = angle(toGoal - car.heading);
        const curvature = (2 * Math.sin(headingToGoal)) / range;
        const steer = steeringForCurvature(curvature, RECOVERY_SPEED);
        const reverse =
          Math.abs(headingToGoal) > 2.15 &&
          range < 12 &&
          !recoveryBlocked(car, -steer, -RECOVERY_SPEED, obstacles);
        maneuver.direct_steering = reverse ? -steer : steer;
        target = reverse ? -RECOVERY_SPEED : RECOVERY_SPEED;
      }
    } else {
      // Nudge the pursuit point toward the lane centre so Autosteer sits
      // between the two blue lines instead of hunting the centreline.
      maneuver.lane_offset_m = clamp(-signedOffset(car, near) * 0.28, -0.9, 0.9);
    }

    // Controls are advisory observations. The legal stop is made by this
    // controller and the real-time collision envelope in Simulation.step.
    const crossing = sim.crossingFor(car);
    const rule = sim.rule(car);
    const stoppingDistance = (car.speed * car.speed) / (2 * STOP_LINE_DECELERATION);
    if (
      rule.mustStop &&
      crossing &&
      rule.distance > -2 &&
      rule.distance < Math.max(90, stoppingDistance + 14) &&
      !this.recovering
    ) {
      const line = {
        ...pointAt(route.points, crossing.stopS),
        heading: crossing.approach,
        node_id: crossing.nodeId,
        clearance_m: STOP_LINE_MARGIN_M,
        deceleration_mps2: STOP_LINE_DECELERATION,
      };
      const room = stopLineDistance(car, line) - STOP_LINE_MARGIN_M;
      this.stopDistance = round(Math.max(0, room), 2);
      this.reason = rule.reason || "Required stop";
      if (room <= 0.05) {
        target = 0;
        maneuver.stop_at_line = null;
      } else {
        maneuver.stop_at_line = line;
        target = Math.min(
          target,
          Math.sqrt(2 * STOP_LINE_DECELERATION * room),
          room * 2.5,
        );
      }
    }

    const env = sim.speedEnvelope(car);
    if (env.max < target) {
      target = env.max;
      if (!this.recovering && !maneuver.stop_at_line)
        this.reason = env.reason || "Traffic";
    }
    const remaining = Math.max(0, route.length - near.s - DESTINATION_MARGIN_M);
    const arrivalCap = Math.sqrt(2 * STOP_LINE_DECELERATION * remaining);
    if (arrivalCap < target) {
      target = arrivalCap;
      this.reason = "Destination ahead";
    }

    target = clamp(Number.isFinite(target) ? target : 0, -2, sim.world.theme.limit);
    // Ease onto the accelerator, but never ease off a brake: reductions in
    // speed target (traffic, curves, stops) take effect on the same tick.
    if (
      target > this.lastTarget &&
      !this.recovering &&
      !maneuver.stop_at_line
    ) {
      target = Math.min(
        target,
        this.lastTarget + COMFORTABLE_ACCELERATION * dt,
      );
    }
    this.desiredSpeed = target;
    car.maneuver = maneuver;
    car.target = target;
    this.lastTarget = target;
  }
}

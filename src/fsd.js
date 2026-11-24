import {
  angle,
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

const RECOVERY_DISTANCE_M = 6;
const STOP_LINE_MARGIN_M = 0.65;
const STOP_LINE_DECELERATION = 4;
const CURVE_LATERAL_ACCELERATION = 3.5;
const DESTINATION_MARGIN_M = 1;

function curveSpeed(route, from, speed) {
  let limit = Infinity;
  const step = 6;
  for (let ahead = step; ahead <= 36; ahead += step) {
    const a = pointAt(route.points, from + ahead - step);
    const b = pointAt(route.points, from + ahead);
    const headingA = a.heading ?? route.points[0]?.heading ?? 0;
    const headingB = b.heading ?? headingA;
    const change = Math.abs(angle(headingB - headingA));
    if (change < 0.002) continue;
    const radius = step / change;
    // Drivers slow for the bend before it begins; the square-root term lets
    // the car enter the curve already close to its sustainable speed.
    limit = Math.min(limit, Math.sqrt(CURVE_LATERAL_ACCELERATION * radius) + 0.5);
  }
  return limit;
}

/**
 * Local Full Self-Driving controller.
 *
 * It uses only observations already available in the simulation: the planned
 * route, the road/speed rules, and the observed traffic. No network request,
 * API key or model response is needed for the car to drive itself.
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
    if (sim.complete || sim.crash || sim.freeExplore) {
      this.reason = sim.complete ? "Arrived" : sim.crash ? "Stopped" : "Free play";
      this.desiredSpeed = this.lastTarget = 0;
      return;
    }
    this.decisions++;
    const route = car.route;
    const near = nearestOnPath(car, route.points);
    const maneuver = { lane_offset_m: 0, lookahead_m: 6, stop_at_line: null };
    let target = Math.min(sim.world.theme.limit, routeSpeedLimit(car, near.s));
    this.stopDistance = null;
    this.recovering = false;
    this.reason = "Cruising";

    // Pure pursuit follows the route centreline rather than a fixed heading,
    // so turns, ramps and U-turn arcs are tracked with the same controller.
    maneuver.lookahead_m = clamp(4 + Math.abs(car.speed) * 0.7, 5, 16);
    target = Math.min(target, curveSpeed(route, near.s, car.speed));

    if (
      near.distance > RECOVERY_DISTANCE_M ||
      Math.abs(angle(near.heading - car.heading)) > 1.2
    ) {
      this.recovering = true;
      this.reason = "Returning to route";
      const goalS = clamp(near.s + 7, 0, route.length);
      const goal = pointAt(route.points, goalS);
      const headingError = angle(heading(car, goal) - car.heading);
      const range = Math.max(2, dist(car, goal));
      maneuver.direct_steering = steeringForCurvature(
        (2 * Math.sin(headingError)) / range,
        car.speed,
      );
      target = Math.min(target, 2);
    }

    // Controls are advisory observations. The legal stop is made by this
    // controller and the real-time collision envelope in Simulation.step.
    const crossing = sim.crossingFor(car);
    const rule = sim.rule(car);
    if (
      rule.mustStop &&
      crossing &&
      rule.distance > -2 &&
      rule.distance < 90 &&
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
      if (!this.recovering && !maneuver.stop_at_line) this.reason = env.reason || "Traffic";
    }
    const remaining = Math.max(0, route.length - near.s - DESTINATION_MARGIN_M);
    const arrivalCap = Math.sqrt(2 * STOP_LINE_DECELERATION * remaining);
    if (arrivalCap < target) {
      target = arrivalCap;
      this.reason = "Destination ahead";
    }

    target = clamp(Number.isFinite(target) ? target : 0, -2, sim.world.theme.limit);
    this.desiredSpeed = target;
    car.maneuver = maneuver;
    car.target = target;
    this.lastTarget = target;
  }
}

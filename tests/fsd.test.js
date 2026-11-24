import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/simulation.js";
import { angle, dist, heading, move, nearestOnPath, pointAt } from "../src/math.js";

function driveToEnd(world, seed, limit = 12000) {
  const sim = new Simulation(seed, world);
  assert.equal(sim.setDriverMode("fsd"), true);
  assert.equal(sim.fsdActive, true);
  let observedMode = null;
  for (let tick = 0; tick < limit && !sim.complete && !sim.crash; tick++) {
    sim.step(0.05);
    if (tick === 100) observedMode = sim.observation().driver.mode;
  }
  return { sim, observedMode };
}

test("FSD drives the whole route without any API, credits or sign-in", () => {
  const fetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("FSD must never call the decision API");
  };
  try {
    const { sim, observedMode } = driveToEnd("town", 42);
    assert.equal(observedMode, "fsd");
    assert.equal(sim.complete, true, `never arrived (time ${sim.time}s)`);
    assert.equal(sim.crash, null);
    assert.equal(sim.collisions, 0);
    assert.equal(sim.violations, 0);
    assert.equal(sim.autopilot, false, "autopilot releases on arrival");
  } finally {
    globalThis.fetch = fetch;
  }
});

test("FSD completes city and interstate drives with traffic and pedestrians", () => {
  for (const [world, seed] of [
    ["city", 1],
    ["highway", 7],
  ]) {
    const { sim } = driveToEnd(world, seed);
    assert.equal(
      sim.complete,
      true,
      `${world} seed ${seed} never arrived (time ${sim.time}s)`,
    );
    assert.equal(sim.collisions, 0, `${world}: unexpected collision`);
    assert.equal(sim.violations, 0, `${world}: traffic violation`);
  }
});

test("FSD stops before a stop line and continues once the stop is served", () => {
  const sim = new Simulation(42, "town");
  const car = sim.player;
  const crossing = car.route.crossings.find(
    (c) => sim.world.byId[c.nodeId].control === "stop",
  );
  assert(crossing, "test route needs a stop sign");
  sim.traffic = [];
  sim.pedestrians = [];
  car.s = crossing.stopS - 18;
  Object.assign(car, pointAt(car.route.points, car.s));
  car.heading = pointAt(car.route.points, car.s + 1).heading;
  car.speed = 12;
  car.target = 12;
  sim.setDriverMode("fsd");
  let stoppedAtLine = false;
  for (let tick = 0; tick < 700 && car.s < crossing.stopS + 4; tick++) {
    sim.step(0.05);
    if (Math.abs(car.speed) < 0.2 && sim.fsd.stopDistance < 1)
      stoppedAtLine = true;
  }
  assert(stoppedAtLine, "car did not come to rest at the stop line");
  assert(car.stops[crossing.nodeId]?.served, "stop was not recorded");
  assert(car.s > crossing.stopS + 2, "car did not continue after stopping");
  assert.equal(sim.violations, 0);
});

test("FSD follows the route centreline and can be taken over manually", () => {
  const sim = new Simulation(5, "town");
  sim.setDriverMode("fsd");
  for (let tick = 0; tick < 200; tick++) sim.step(0.05);
  const near = nearestOnPath(sim.player, sim.player.route.points);
  assert(near.distance < 1.5, `left the lane by ${near.distance} m`);
  assert(sim.player.speed > 3, "FSD did not accelerate");
  assert(Math.abs(angle(sim.player.heading - near.heading)) < 0.35);
  sim.setDriverMode("manual");
  assert.equal(sim.fsdActive, false);
  assert.equal(sim.autopilot, false);
  sim.pedals.throttle = 0;
  sim.pedals.brake = 1;
  for (let tick = 0; tick < 40; tick++) sim.step(0.05);
  assert(Math.abs(sim.player.speed) < 0.1, "manual brake did not take over");
});

test("FSD picks up at the next intersection after a missed turn instead of crashing", () => {
  const sim = new Simulation(42, "town");
  sim.traffic = [];
  sim.pedestrians = [];
  const car = sim.player;
  const turn = car.route.crossings.find((c) => {
    const delta = Math.abs(angle(c.exit - c.approach));
    if (delta < 0.7 || delta > 2.4) return false;
    const node = sim.world.byId[c.nodeId];
    return node.neighbors.some((id) => {
      const n = sim.world.byId[id];
      return Math.abs(angle(heading(node, n) - c.approach)) < 0.3 && dist(node, n) > 40;
    });
  });
  assert(turn, "test route needs a left/right turn with a road continuing straight");
  const past = move(turn, turn.approach, 22);
  Object.assign(car, move(past, turn.approach + Math.PI / 2, 3));
  car.heading = turn.approach;
  car.speed = 7;
  car.target = 7;
  car.s = turn.stopS + 22;
  const version = sim.routeVersion;
  sim.setDriverMode("fsd");
  assert(sim.routeVersion > version, "engaging FSD off-route must splice a new path");
  for (let tick = 0; tick < 900 && !sim.complete && !sim.crash; tick++) sim.step(0.05);
  assert.equal(sim.crash, null, "FSD crashed after a missed turn");
  const near = nearestOnPath(car, car.route.points);
  assert(near.distance < 4, `not on the new lane (${near.distance.toFixed(2)} m)`);
  assert(
    Math.abs(angle(car.heading - near.heading)) < 0.7,
    "heading did not align with the replacement route",
  );
});

extends SceneTree
## Run: godot --headless --path godot --script tests/regression.gd
var game
var checks := 0
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("run")

func check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures.append(label)
		push_error("FAIL: " + label)

func settle() -> void:
	await physics_frame
	await physics_frame

func run() -> void:
	game = load("res://scenes/main.tscn").instantiate()
	root.add_child(game)
	await settle()
	check(game.actors.size() == 4, "one player, target and two guards")
	check(game.player.sprite.sprite_frames.has_animation("stab_7"), "original paired assassination frames / all eight directions")
	check(game.player.collision_mask == 1, "ground floor collision mask")
	var guard: VIPActor = game.actors[2]
	var upstairs: VIPActor = game.actors[3]
	var patrol_start := guard.position
	game.started = true
	var ground_waypoints: Dictionary = {}
	var upper_waypoints: Dictionary = {}
	for i in range(90):
		await physics_frame
	check(guard.position.distance_to(patrol_start) > 55, "repeated path refresh advances a real patrol instead of returning to start-cell centre")
	for i in range(2400):
		ground_waypoints[guard.waypoint] = true
		upper_waypoints[upstairs.waypoint] = true
		await physics_frame
	game.started = false
	check(ground_waypoints.size() == 4, "ground patrol completes every waypoint through the staff doorway")
	check(upper_waypoints.size() == 4, "upper patrol completes every waypoint through the office doorway")
	check(upstairs.collision_mask == 2, "upper floor has an independent collision layer")
	check(not game.find_path(game.cell(Vector2i(8,5)),game.stair_point,0).is_empty(), "walkable route to ground stairs")
	check(not game.find_path(game.stair_point,game.ledger_point,1).is_empty(), "walkable upper-floor route to ledger")
	var door: Dictionary = game.doors[0]
	game.player.position = game.cell(Vector2i(3,11))
	upstairs.position = door.body.position
	check(game.toggle_door(door) and not door.open, "person on another floor cannot block a door")
	await settle()
	var a: Vector2 = door.body.position + Vector2(0,-35)
	var b: Vector2 = door.body.position + Vector2(0,35)
	check(not game.clear_line(a,b,0), "closed door blocks actual guard raycast")
	check(game.toggle_door(door) and door.open, "closed door can be reopened")
	await settle()
	check(game.clear_line(a,b,0), "open door releases actual guard raycast")
	game.player.position = door.body.position
	check(not game.toggle_door(door) and door.open, "player on same floor blocks closing")
	check("내가" in game.tip, "door blocker message identifies the real blocker")
	game.player.position = game.uniform_point
	guard.position = game.uniform_point
	guard.down = true
	check(game.context().get("kind","") == "uniform", "clothing interaction stays explicit beside a body")
	game.interact()
	check(game.uniform, "uniform can be equipped")
	game.player.position = game.cell(Vector2i(14,6))
	check(not game.trespassing(), "staff uniform permits ground staff corridor")
	game.player.set_floor(1)
	check(game.trespassing(), "uniform never permits upper security floor")
	game.player.set_floor(0)
	guard.down = false
	guard.position = game.stair_point + Vector2(-72,0)
	guard.face = Vector2.RIGHT
	guard.state = "chase"
	guard.suspicion = 1
	game.player.position = game.stair_point
	game.player.stair_cooldown = 0
	game.auto_stair(game.player)
	check(game.player.floor_index == 1 and game.player.collision_mask == 2, "stairs switch both floor and actual collision")
	check(guard.memory_floor == 1, "witnessed stair entry informs pursuing guard")
	check(game.player.position.distance_to(game.stair_point) > 18, "landing avoids an instant stair bounce")
	upstairs.position = game.cell(Vector2i(4,7))
	upstairs.down = true
	game.started = true
	game.player.position = game.cell(Vector2i(15,3))
	for i in range(120):
		await physics_frame
	check(guard.floor_index == 1, "pursuer physically walks to stairs and follows upstairs")
	game.started = false
	guard.position = game.stair_point + Vector2(-70,0)
	guard.face = Vector2.RIGHT
	guard.state = "chase"
	guard.recognized = true
	game.player.position = game.stair_point
	game.player.stair_cooldown = 0
	game.auto_stair(game.player)
	check(guard.memory_floor == 0, "witnessed stair descent is recorded too")
	game.started = true
	game.player.position = game.cell(Vector2i(15,3))
	for i in range(120):
		await physics_frame
	check(guard.floor_index == 0, "pursuer also follows downstairs")
	game.started = false
	check(game.detections <= 1, "one pursuit is not counted as repeated fresh detections at a sight boundary")
	game.player.set_floor(1)
	game.player.position = game.ledger_point
	game.interact()
	check(game.ledger, "ledger can be recovered")
	game.player.set_floor(0)
	game.player.position = game.exit_point
	game.interact()
	check(not game.finished, "exit requires the real target kill as well as ledger")
	game.player.position = game.target.position + Vector2(0,36)
	game.target.face = Vector2.UP
	check(game.behind(game.target), "rear takedown geometry")
	game.player.position = game.target.position + Vector2(0,-36)
	check(not game.behind(game.target), "front attack is not silently accepted as assassination")
	game.target.incapacitate(false)
	check(not game.target.dead, "knockout does not count as a lethal contract")
	game.target.incapacitate(true)
	game.player.position = game.exit_point
	game.interact()
	check(game.finished and game.won, "real objectives unlock extraction")
	var result := {"checks":checks,"failures":failures}
	print("VIP_REGRESSION: " + JSON.stringify(result))
	game.queue_free()
	await process_frame
	quit(0 if failures.is_empty() else 1)

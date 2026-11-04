extends SceneTree
## Mechanical, pixel-preserving atlas crop. Keep each texture below 2048px.
func _initialize() -> void:
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/actors.json"))
	for body in meta.bodies:
		var source := Image.load_from_file("res://assets/original/body_%s.webp" % body)
		var animations: Dictionary = meta.bodies[body].anims
		for anim in ["idle", "walk", "run", "sneak", "crouch", "death", "stab", "stabbed", "choke", "choked"]:
			if not animations.has(anim):
				continue
			var cols: Array = animations[anim]
			var strip := source.get_region(Rect2i(int(cols[0]) * 64, 0, int(cols[1]) * 64, 512))
			DirAccess.make_dir_recursive_absolute("res://assets/actors/%s" % body)
			var error := strip.save_png("res://assets/actors/%s/%s.png" % [body, anim])
			assert(error == OK)
	print("EXTRACT_OK: original pixels, 8 directions, max strip 640 × 512")
	quit()

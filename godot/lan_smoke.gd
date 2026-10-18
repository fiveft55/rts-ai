extends SceneTree
## End-to-end Godot HTTP client against an externally started bot host.
var client: Node
var phase := 0
var elapsed := 0.0

func _initialize() -> void:
	call_deferred("start")

func start() -> void:
	client=load("res://main.gd").new()
	root.add_child(client)
	client.join_lan()

func _process(delta: float) -> bool:
	elapsed+=delta
	if elapsed>10:
		push_error("Godot LAN smoke timed out")
		quit(1)
		return false
	if client==null:
		return false
	if phase==0 and not client.token.is_empty():
		client.issue({"type":"train","kind":"soldier"})
		phase=1
	if phase==1 and client.game.credits[0]==60:
		print("Godot LAN smoke: join, command, sequence and authoritative snapshot passed")
		client.offline()
		phase=2
	if phase==2 and client.request_kind.is_empty():
		quit()
	return false

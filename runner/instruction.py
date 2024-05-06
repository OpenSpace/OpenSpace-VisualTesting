import time

Allowed_Types = [
  "action",
  "deltatime",
  "navigationstate",
  "pause",
  "property",
  "recording",
  "screenshot",
  # "script",
  "time",
  "wait"
]

class Instruction:
  def __init__(self, obj):
    if not "type" in obj:
      raise Exception("Missing key 'type'")

    if not obj["type"] in Allowed_Types:
      type = obj["type"]
      raise Exception(f"Invalid type '{type}")

    self.type = obj["type"]

    # Just as simplification as not all types need a 'value' object
    if not "value" in obj:
      obj["value"] = {}

    self.value = obj["value"]

  def __repr__(self):
    if self.value == {}:
      return f"({self.type})"
    else:
      return f"({self.type}: {self.value})"

  def is_screenshot(self):
    return self.type == "screenshot"

  async def run(self, openspace):
    match self.type:
      case "action":
        print(f"  Action: {self.value}")
        await openspace.action.triggerAction(self.value)
      case "deltatime":
        print(f"  Deltatime: {self.value}")
        await openspace.time.setDeltaTime(self.value)
      case "navigationstate":
        v = {
          "Anchor": self.value["anchor"],
          "Position": self.value["position"]
        }
        if "aim" in self.value:
          v["Aim"] = self.value["aim"]
        if "referenceFrame" in self.value:
          v["ReferenceFrame"] = self.value["referenceFrame"]
        if "up" in self.value:
          v["Up"] = self.value["up"]
        if "yaw" in self.value:
          v["Yaw"] = self.value["yaw"]
        if "pitch" in self.value:
          v["Pitch"] = self.value["pitch"]
        if "timestamp" in self.value:
          v["Timestamp"] = self.value["timestamp"]

        print(f"  NavigationState: {v}")
        await openspace.navigation.setNavigationState(v, "timestamp" in self.value)
      case "pause":
        print(f"  Set Pause: {self.value}")
        await openspace.time.setPause(self.value)
      case "property":
        prop = self.value["property"]
        val = self.value["value"]
        print(f"  Set Property: {prop} -> {val}")
        await openspace.setPropertyValue(prop, val)
      case "recording":
        print(f"  Start Playback: {self.value}")
        await openspace.recording.startPlayback(self.value)
      case "screenshot":
        print("  Take Screenshot")
        await openspace.takeScreenshot()
      case "time":
        print(f"  Set Time: {self.value}")
        await openspace.time.setTime(self.value)
      case "wait":
        print(f"  Wait: {self.value}")
        time.sleep(int(self.value))

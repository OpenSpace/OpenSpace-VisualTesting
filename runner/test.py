import json
import os
import time

test_base_dir = "tests/visual"
Allowed_Types = [
  "action",
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
      raise Exception(f"Invalid type '{obj["type"]}")

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
      case "navigationstate":
        v = {
          "Anchor": self.value["anchor"],
          "Position": self.value["position"]
        }
        if self.value["aim"]:
          v["Aim"] = self.value["aim"]
        if self.value["referenceFrame"]:
          v["ReferenceFrame"] = self.value["referenceFrame"]
        if self.value["up"]:
          v["Up"] = self.value["up"]
        if self.value["yaw"]:
          v["Yaw"] = self.value["yaw"]
        if self.value["pitch"]:
          v["Pitch"] = self.value["pitch"]
        if self.value["timestamp"]:
          v["Timestamp"] = self.value["timestamp"]

        print(f"  NavigationState: {v}")
        await openspace.navigation.setNavigationState(v, "timestamp" in self.value)
      case "pause":
        print(f"  Set Pause: {self.value}")
        await openspace.time.setPause(self.value)
      case "property":
        print(f"  Set Property: {self.value["property"]} -> {self.value["value"]}")
        await openspace.setPropertyValue(self.value["property"], self.value["value"])
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


# @TODO: Check that at least one instruction is to take a screenshot
class Test:
  def __init__(self, path):
    assert(os.path.isfile(path))
    self.test_path = path

    with open(path) as f:
      content = json.load(f)

    if content["profile"] is None:
      raise f"Missing 'profile' in test {path}'"
    self.profile = content["profile"]

    if content["commands"] is None:
      raise Exception(f"Missing 'commands' is test {path}")

    self.instructions = []
    for command in content["commands"]:
      try:
        self.instructions.append(Instruction(command))
      except Exception as error:
        raise Exception(f"Error loading test {path}: {error}")

  async def run(self, openspace) -> float:
    count_screenshots = 0
    for instruction in self.instructions:
      await instruction.run(openspace)

      if instruction.is_screenshot():
        count_screenshots = count_screenshots + 1

    return count_screenshots

  def get_group_and_name(self):
    # Get the testname by removing everything before (and including) "test/visual" and also
    # removing the extension
    start_idx = self.test_path.find(test_base_dir) + len(test_base_dir) + 1
    full = self.test_path[start_idx:-len(".ostest")]
    parts = full.split("/")

    # The last part is the name of test, all others are combined to make the grouping
    group = "-".join(parts[0:-1])
    name = parts[-1]
    return group, name



import json
import os

test_base_dir = "tests/visual"
Allowed_Types = [
  "action",
  "navigationstate",
  "pause",
  "recording",
  "screenshot",
  "script",
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

    print(self.instructions)


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



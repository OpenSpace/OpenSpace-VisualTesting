import json
import os

from instruction import Instruction

test_base_dir = "tests/visual"

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

    found_screenshot_instruction = False
    for instruction in self.instructions:
      if instruction.type == "screenshot":
        found_screenshot_instruction = True
        break

    if not found_screenshot_instruction:
      raise Exception(f"Error loading test {path}: No screenshot instruction")


  async def run(self, openspace):
    for instruction in self.instructions:
      await instruction.run(openspace)

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



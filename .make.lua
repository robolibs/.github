-- The 19 subprojects, together. Each is a submodule with its own .make.lua; these recipes go into
-- each and call the recipe there, so `make` inside a checkout still means that project alone.
--
--   make build · test    every project, in turn
--   make status · update · push    where each checkout stands, and moving it

local make = oslo.make

local MEMBERS = {
  "agentio", "authbox", "concord", "coreviz", "datapod", "gearbox", "graphix",
  "keylock", "machbus", "maptrax", "ondrive", "peerbus", "rastera", "stateup",
  "syncbot", "tagdata", "vectory", "wirebit", "zoneout",
}

local function sh_run(command)
  assert(oslo.run{ "sh", "-c", command }.ok, command .. " failed")
end

local function captured(command)
  local done = oslo.run{ "sh", "-c", command, capture = true }
  return done.ok, ((done.out or ""):gsub("%s+$", ""))
end

-- A clone made without --recursive leaves each member an empty directory.
local function checked_out()
  for _, name in ipairs(MEMBERS) do
    if not oslo.fs.stat(name .. "/.git") then
      sh_run("git submodule update --init")
      return
    end
  end
end

local function each(recipe)
  checked_out()
  for _, name in ipairs(MEMBERS) do
    print(oslo.ui.title(("%s · make %s"):format(name, recipe)))
    sh_run(("cd %s && oslo make %s"):format(name, recipe))
  end
end

make.recipe{ name = "build", desc = "every project", run = function() each("build") end }
make.alias("b", "build")

make.recipe{ name = "test", desc = "every suite", run = function() each("test") end }
make.alias("t", "test")

local STATUS = [[
for name in MEMBERS; do
  git -C "$name" fetch -q origin 2>/dev/null
  branch=$(git -C "$name" branch --show-current); [ -n "$branch" ] || branch=detached
  printf '%-10s %-9s ahead %-3s behind %-3s changed %s\n' "$name" "$branch" \
    "$(git -C "$name" rev-list --count '@{u}..HEAD' 2>/dev/null || echo -)" \
    "$(git -C "$name" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo -)" \
    "$(git -C "$name" status --porcelain | wc -l)"
done
]]

make.recipe{ name = "status", desc = "each checkout: its branch, commits not pushed, changes not committed",
             run = function() sh_run((STATUS:gsub("MEMBERS", table.concat(MEMBERS, " ")))) end }
make.alias("s", "status")

make.recipe{ name = "update", desc = "every checkout to the tip of its tracked branch",
             run = function() sh_run("git submodule update --init --remote --merge") end }

-- Checked for all nineteen before any is pushed, and pushed before anything is pinned: a pin to a
-- commit GitHub has never seen is a clone that fails for everybody but you.
make.recipe{
  name = "push",
  desc = "push each checkout's own branch, then pin what was pushed here",
  run = function()
    for _, name in ipairs(MEMBERS) do
      local _, branch = captured(("git -C %s branch --show-current"):format(name))
      local _, changed = captured(("git -C %s status --porcelain"):format(name))
      assert(changed == "", name .. " has uncommitted changes; nothing was pushed")
      assert(branch ~= "", name .. " is not on a branch; nothing was pushed")
    end
    for _, name in ipairs(MEMBERS) do
      local _, branch = captured(("git -C %s branch --show-current"):format(name))
      sh_run(("git -C %s push -q origin %s"):format(name, branch))
    end
    local _, moved = captured("git diff --name-only -- " .. table.concat(MEMBERS, " "))
    if moved == "" then
      print("every pin is already where its checkout is")
      return
    end
    local names = {}
    for line in moved:gmatch("[^\n]+") do names[#names + 1] = line end
    local listed = table.concat(names, " ")
    sh_run(("git commit -q -m 'chore(pin): %s' -- %s"):format(table.concat(names, ", "), listed))
    sh_run("git push -q origin HEAD")
  end,
}

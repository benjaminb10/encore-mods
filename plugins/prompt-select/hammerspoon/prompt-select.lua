-- prompt-select (experimental): Cmd+A on Claude Code's prompt, in Orca's terminal.
-- Claude Code's prompt has no selection, so Cmd+A "selects" it here: the prompt-select mod paints it like a mouse
-- selection (on a signal in ~/Library/Caches/prompt-select/select/<session>), then Delete clears it (Ctrl+L,
-- Claude Code's chat:clearInput), Cmd+C copies it, Cmd+X copies then clears it, a letter replaces it, and any
-- other key cancels. Elsewhere in Orca (search fields, the built-in browser), Cmd+A stays as it was.
-- The prompt's text comes from the mod, which writes it to ~/Library/Caches/prompt-select/prompts/<session>.txt.

local M = {}
local DIR = os.getenv("HOME") .. "/Library/Caches/prompt-select/prompts"
local SIG = os.getenv("HOME") .. "/Library/Caches/prompt-select/select"
local count = 0
local selected = false
local cancelTimer = nil

local function orcaTerminalFocused()
  local app = hs.application.frontmostApplication()
  if not app or app:name() ~= "Orca" then return false end
  local ax = hs.axuielement.applicationElement(app)
  local e = ax and ax:attributeValue("AXFocusedUIElement")
  if not e then return false end
  local classes = e:attributeValue("AXDOMClassList") or {}
  for _, c in ipairs(classes) do
    if c == "xterm-helper-textarea" then return true end
  end
  return false
end

-- The prompt files (hs.fs.dir's iterator needs its directory object, so no "or" around it)
local function files()
  local ok, iter, dirObj = pcall(hs.fs.dir, DIR)
  if not ok or not iter then return function() return nil end end
  return function() return iter(dirObj) end
end

-- The session typed in last: the most recently written prompt file
local function currentSession()
  local newest, newestTime = nil, -1
  for f in files() do
    if f:match("%.txt$") then
      local t = hs.fs.attributes(DIR .. "/" .. f, "modification")
      if t and t > newestTime then newest, newestTime = f, t end
    end
  end
  return newest and newest:gsub("%.txt$", "")
end

-- Tells that session's prompt-select to paint its prompt as selected, or not
local function signal(on)
  local id = currentSession()
  if not id then return end
  hs.fs.mkdir(SIG)
  count = count + 1
  local h = io.open(SIG .. "/" .. id, "w")
  if h then h:write((on and "on " or "off ") .. count) h:close() end
end

-- The prompt of the session typed in last: the most recently written file
local function currentPrompt()
  local newest, newestTime = nil, -1
  for f in files() do
    if f:match("%.txt$") then
      local t = hs.fs.attributes(DIR .. "/" .. f, "modification")
      if t and t > newestTime then newest, newestTime = f, t end
    end
  end
  if not newest then return nil end
  local h = io.open(DIR .. "/" .. newest, "r")
  if not h then return nil end
  local text = h:read("*a")
  h:close()
  return text
end

local function unselect(repaint)
  if selected and repaint ~= false then signal(false) end
  selected = false
  if cancelTimer then cancelTimer:stop() cancelTimer = nil end
end

local function select()
  selected = true
  signal(true)
  if cancelTimer then cancelTimer:stop() end
  cancelTimer = hs.timer.doAfter(30, function() unselect() end)
end

local function clearPrompt()
  hs.eventtap.keyStroke({ "ctrl" }, "l", 0)
end

local function copyPrompt()
  local text = currentPrompt()
  if text and #text > 0 then
    hs.pasteboard.setContents(text)
    return true
  end
  hs.alert.show("Nothing to copy: is the prompt-select mod installed?", 2)
  return false
end

-- Electron only exposes its fields to accessibility once asked
local function enableAX()
  local app = hs.application.get("Orca")
  if app then pcall(function() hs.axuielement.applicationElement(app):setAttributeValue("AXManualAccessibility", true) end) end
end

M.watcher = hs.application.watcher.new(function(name, event)
  if name == "Orca" and (event == hs.application.watcher.launched or event == hs.application.watcher.activated) then enableAX() end
end)

M.tap = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, function(ev)
  local flags = ev:getFlags()
  local key = hs.keycodes.map[ev:getKeyCode()]
  local cmdOnly = flags.cmd and not (flags.alt or flags.ctrl or flags.shift)

  if not selected then
    if cmdOnly and key == "a" and orcaTerminalFocused() then
      select()
      return true
    end
    return false
  end

  -- A key while the prompt is "selected"
  if key == "delete" or key == "forwarddelete" then
    unselect(false); clearPrompt(); return true
  end
  -- Copy keeps the selection, as in any text field
  if cmdOnly and key == "c" then copyPrompt(); return true end
  if cmdOnly and key == "x" then
    if copyPrompt() then unselect(false); clearPrompt() end; return true
  end
  if cmdOnly and key == "a" then return true end
  if key == "escape" then unselect(); return true end
  -- A letter typed replaces the prompt, like in any text field
  local plain = not (flags.cmd or flags.ctrl or flags.alt)
  local char = ev:getCharacters()
  local replaces = plain and char and #char > 0 and not char:match("^[%c]") and not (key == "return" or key == "tab" or key == "up" or key == "down" or key == "left" or key == "right")
  unselect(not replaces)
  if replaces then clearPrompt() end
  return false
end)
enableAX()
M.watcher:start()
M.tap:start()

return M

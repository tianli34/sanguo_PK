"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const defenseNames = { block: "格挡", parry: "卸力", dodge: "闪避", counter: "反击" };
const actionClasses = ["attack", "dodge", "block", "parry", "counter", "clash", "hit"];

const player = {
  battle: null,
  states: {},
  index: 0,
  speed: 1,
  playing: false,
  runActive: false,
  generation: 0,
  animationErrorShown: false,
};

function warriorSVG(side) {
  const blue = side === "A";
  const armor = blue ? "#28677a" : "#9d4034";
  const armorLight = blue ? "#4a91a0" : "#c46a52";
  const horse = blue ? "#3d4240" : "#563a30";
  const horseLight = blue ? "#606761" : "#79584a";
  const plume = blue ? "#b9d7d6" : "#e0b083";
  return `
    <svg viewBox="0 0 300 225" role="img" aria-label="${blue ? "蓝军" : "赤军"}骑马武将">
      <g class="horse">
        <path d="M73 143 Q44 126 42 151 Q51 137 65 157" fill="none" stroke="${horse}" stroke-width="12" stroke-linecap="round"/>
        <path d="M89 174 L82 207 L69 214 L86 214 L98 179" fill="${horse}"/>
        <path d="M123 179 L128 207 L120 215 L137 214 L141 178" fill="${horseLight}"/>
        <path d="M184 175 L193 204 L187 214 L204 211 L204 170" fill="${horse}"/>
        <path d="M207 164 L226 195 L223 207 L237 202 L224 157" fill="${horseLight}"/>
        <ellipse cx="143" cy="151" rx="79" ry="39" fill="${horse}"/>
        <path d="M179 150 Q188 116 207 88 L230 99 Q213 132 211 163" fill="${horse}"/>
        <path d="M199 98 Q205 73 228 70 L250 81 L248 98 L228 105 L211 111" fill="${horseLight}"/>
        <path d="M223 72 L219 57 L231 69 M238 75 L244 61 L246 79" fill="${horse}" stroke="${horse}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M242 91 L256 94 L251 103 L234 102" fill="${horse}"/>
        <circle cx="235" cy="82" r="2.8" fill="#e6c77e"/>
        <path d="M211 86 Q195 101 190 127" fill="none" stroke="#252b29" stroke-width="8" stroke-dasharray="3 5"/>
        <path d="M84 133 Q142 111 199 136 L188 170 Q136 183 83 159 Z" fill="${armor}" opacity=".92"/>
        <path d="M92 139 Q142 124 190 140" fill="none" stroke="${armorLight}" stroke-width="4"/>
        <path d="M100 158 Q142 170 181 156" fill="none" stroke="#d1b26c" stroke-width="3" stroke-dasharray="8 5"/>
        <path d="M203 105 Q224 115 242 102" fill="none" stroke="#bea165" stroke-width="3"/>
        <path d="M218 110 L180 127 L137 101" fill="none" stroke="#bea165" stroke-width="2"/>
      </g>
      <g class="rider">
        <path d="M124 105 L111 146 L129 150 L145 113" fill="#252c2d"/>
        <path d="M150 108 L172 143 L187 139 L165 95" fill="#2e302d"/>
        <path d="M113 143 L98 151 L119 157 L132 149" fill="#1d2323"/>
        <path d="M172 137 L178 153 L197 145 L185 135" fill="#1d2323"/>
        <path d="M118 62 Q141 48 163 63 L171 108 Q145 122 113 104 Z" fill="${armor}"/>
        <path d="M124 70 L157 66 L163 96 L119 95 Z" fill="${armorLight}"/>
        <path d="M130 70 L133 97 M145 67 L148 99" stroke="#d1b26c" stroke-width="3"/>
        <path d="M118 68 Q103 70 100 86 L119 91 L130 76" fill="${armor}"/>
        <path d="M160 67 Q176 64 184 78 L167 88 L154 76" fill="${armor}"/>
        <path d="M113 105 Q142 115 171 103" fill="none" stroke="#c8a35c" stroke-width="6"/>
        <path d="M133 55 L132 65 L149 66 L150 52" fill="#bd8a68"/>
        <circle cx="141" cy="43" r="18" fill="#c99a76"/>
        <path d="M122 42 Q121 20 142 18 Q164 22 161 45 L153 36 L127 38 Z" fill="#313838"/>
        <path d="M121 36 Q140 25 163 37 L160 29 Q141 10 122 29 Z" fill="${armor}"/>
        <path d="M120 35 L162 34" stroke="#d2b46f" stroke-width="4"/>
        <path d="M140 18 Q135 3 148 0 Q143 11 154 18" fill="${plume}"/>
        <path d="M152 46 L158 47" stroke="#392c25" stroke-width="2"/>
        <path d="M139 54 Q147 58 153 52" fill="none" stroke="#704d3c" stroke-width="2"/>
        <path d="M109 80 Q127 84 143 97" fill="none" stroke="#bd8a68" stroke-width="8" stroke-linecap="round"/>
        <path d="M176 78 Q163 82 153 95" fill="none" stroke="#bd8a68" stroke-width="8" stroke-linecap="round"/>
      </g>
      <g class="weapon">
        <path d="M112 127 L248 22" stroke="#6b4b2d" stroke-width="5" stroke-linecap="round"/>
        <path d="M239 29 L267 4 L253 35 L243 42 Z" fill="#d7d9cc" stroke="#696e68" stroke-width="2"/>
        <path d="M239 31 L224 25" stroke="${armorLight}" stroke-width="5"/>
      </g>
    </svg>`;
}

$("#sprite-a").innerHTML = warriorSVG("A");
$("#sprite-b").innerHTML = warriorSVG("B");

function formatNumber(value) {
  return String(Math.max(0, Math.round(value)));
}

// 血条/体力条按剩余比例分四档换色：≥75%、<75%、<50%、<25%
function barStage(ratio) {
  const percent = ratio * 100;
  if (percent < 25) return "1";
  if (percent < 50) return "2";
  if (percent < 75) return "3";
  return "4";
}

// 阶段一旦下跌（跌破 75% / 50% / 25%），整条血槽闪一次边框提示。
let suppressBarFlash = false;

function flashBarStage(track, stage) {
  track.dataset.flashStage = stage;
  track.classList.remove("stage-flash");
  void track.offsetWidth; // 强制回流，保证连续触发也能重新播放动画
  track.classList.add("stage-flash");
}

function paintBar(fill, ratio) {
  if (!fill) return;
  const stage = barStage(ratio);
  const previous = fill.dataset.stage;
  fill.style.width = `${ratio * 100}%`;
  if (previous === stage) return;
  fill.dataset.stage = stage;
  const track = fill.parentElement;
  if (!track) return;
  // 只在掉档时闪；回血、重播复位、进度重建都不闪。
  if (previous && Number(stage) < Number(previous) && !suppressBarFlash) flashBarStage(track, stage);
  else track.removeAttribute("data-flash-stage");
}

$$(".bar").forEach((track) => {
  track.addEventListener("animationend", (event) => {
    if (event.target === track) track.classList.remove("stage-flash");
  });
});

function setAction(text) {
  $("#action-text").textContent = text;
}

function sideKey(side) {
  return String(side).toLowerCase();
}

function updatePanel(side, snapshot) {
  if (!snapshot) return;
  const key = sideKey(side);
  const initial = player.battle.initial_states[String(side).toUpperCase()] || player.battle.initial_states[key] || {};
  const previous = player.states[key] || {};
  const merged = { ...previous, ...snapshot };
  player.states[key] = merged;
  const maxHp = merged.max_hp || initial.max_hp || 1;
  const maxSp = merged.max_sp || initial.max_sp || 1;
  const hpValue = Math.max(0, Math.min(maxHp, merged.hp));
  const spValue = Math.max(0, Math.min(maxSp, merged.sp));
  const hpRatio = hpValue / maxHp;
  const spRatio = spValue / maxSp;
  const hpText = $(`#hp-${key}`);
  const spText = $(`#sp-${key}`);
  hpText.textContent = formatNumber(hpValue);
  spText.textContent = formatNumber(spValue);
  hpText.title = `${formatNumber(hpValue)} / ${formatNumber(maxHp)}（${(hpRatio * 100).toFixed(1)}%）`;
  spText.title = `${formatNumber(spValue)} / ${formatNumber(maxSp)}（${(spRatio * 100).toFixed(1)}%）`;
  $(`#courage-${key}`).textContent = `胆气 ${formatNumber(merged.courage)}`;
  const hpBar = $(`#hp-bar-${key}`);
  const spBar = $(`#sp-bar-${key}`);
  paintBar(hpBar, hpRatio);
  paintBar(spBar, spRatio);
  $(`#panel-${key}`).classList.toggle("fallen", merged.alive === false);
  refreshLeads();
}

const sideLabels = { a: "蓝", b: "赤" };

// 领先幅度：双方按各自上限换算成百分比后比较，单位是百分点。
function percentOf(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return null;
  return Math.max(0, Math.min(100, value / max * 100));
}

function paintPercentDetail(detail, pa, pb) {
  detail.replaceChildren();
  if (pa === null || pb === null) {
    detail.textContent = "— : —";
    return;
  }
  const left = document.createElement("i");
  left.className = "side-a";
  left.textContent = `${pa.toFixed(1)}%`;
  const gap = document.createElement("span");
  gap.textContent = " · ";
  const right = document.createElement("i");
  right.className = "side-b";
  right.textContent = `${pb.toFixed(1)}%`;
  detail.append(left, gap, right);
}

function updateLeadChip(stat) {
  const chip = $(`#lead-chip-${stat}`);
  if (!chip) return;
  const value = $(`#lead-${stat}`);
  const detail = $(`#lead-detail-${stat}`);
  const a = player.states.a || {};
  const b = player.states.b || {};
  const pa = percentOf(a[stat], a[`max_${stat}`]);
  const pb = percentOf(b[stat], b[`max_${stat}`]);
  chip.classList.remove("lead-a", "lead-b", "lead-even");
  paintPercentDetail(detail, pa, pb);
  if (pa === null || pb === null) {
    chip.classList.add("lead-even");
    value.textContent = "—";
    chip.removeAttribute("title");
    return;
  }
  const diff = pa - pb;
  if (Math.abs(diff) < 0.05) {
    chip.classList.add("lead-even");
    value.textContent = "持平";
    chip.title = `双方 ${stat.toUpperCase()} 剩余均为 ${pa.toFixed(1)}%`;
    return;
  }
  const leader = diff > 0 ? "a" : "b";
  chip.classList.add(`lead-${leader}`);
  value.textContent = `${sideLabels[leader]} +${Math.abs(diff).toFixed(1)}%`;
  chip.title = `${sideLabels[leader]}军 ${stat.toUpperCase()} 领先 ${Math.abs(diff).toFixed(1)} 个百分点（蓝 ${pa.toFixed(1)}% · 赤 ${pb.toFixed(1)}%）`;
}

function refreshLeads() {
  updateLeadChip("hp");
  updateLeadChip("sp");
}

function updateControls() {
  const ready = Boolean(player.battle);
  $("#start-button").disabled = !ready || player.playing;
  $("#start-button b").textContent = player.index > 0 && !player.playing && player.index < (player.battle?.events.length || 0) ? "继续" : "开始";
  $("#pause-button").disabled = !ready || !player.playing;
  $("#back-button").disabled = !ready || player.index <= 0;
  $("#replay-button").disabled = !ready;
  $("#skip-button").disabled = !ready || player.index >= (player.battle?.events.length || 0);
  $("#export-button").disabled = !ready;
}

function updateTimeline() {
  const total = player.battle?.events.length || 0;
  const percent = total ? player.index / total * 100 : 0;
  $("#timeline-progress").style.width = `${percent}%`;
  const knob = $("#timeline-knob");
  if (knob) knob.style.left = `${percent}%`;
  $("#event-count").textContent = `${player.index} / ${total}`;
  const timeline = $("#timeline");
  if (timeline) {
    timeline.setAttribute("aria-valuemax", String(total));
    timeline.setAttribute("aria-valuenow", String(player.index));
  }
}

function clearCombatClasses() {
  for (const side of ["a", "b"]) {
    $(`#combatant-${side}`).classList.remove(...actionClasses);
  }
}

function cancelPlayback() {
  player.generation += 1;
  player.playing = false;
  player.runActive = false;
  document.body.classList.remove("paused");
}

function resetPlayback() {
  cancelPlayback();
  player.index = 0;
  player.states = {};
  player.animationErrorShown = false;
  clearCombatClasses();
  for (const side of ["a", "b"]) {
    $(`#combatant-${side}`).classList.remove("dead");
    $(`#float-${side}`).replaceChildren();
    liveFloats[side].clear();
    updatePanel(side, player.battle.initial_states[side.toUpperCase()]);
  }
  $("#effect-layer").replaceChildren();
  $("#battle-log").replaceChildren();
  $("#result-overlay").hidden = true;
  $("#round-label").textContent = "第 1 回合";
  $("#tick-label").textContent = "模拟待启动";
  setAction("双方策马入场");
  updateControls();
  updateTimeline();
}

function logDamage(event, side, key = "hp") {
  const before = event.before?.[side]?.[key];
  const after = event.after?.[side]?.[key];
  return before === undefined || after === undefined ? 0 : Math.max(0, before - after);
}

// 防御词与判定结果分开：前者用楷体，后者用等宽小标签并着色。
function defenseLabel(name, success) {
  const fragment = document.createDocumentFragment();
  const word = document.createElement("b");
  word.className = "def-name";
  word.textContent = name;
  const verdict = document.createElement("em");
  verdict.className = `def-verdict ${success ? "ok" : "fail"}`;
  verdict.textContent = success ? "成功" : "失败";
  fragment.append(word, verdict);
  return fragment;
}

// 结果行：字符串为普通文本，{ text, className } 为着色片段（HP 掉血红、SP 掉蓝蓝）。
function resultLine(parts) {
  const line = document.createElement("span");
  line.className = "log-result";
  parts.forEach((part, index) => {
    if (index) line.append(" · ");
    if (part instanceof Node) {
      line.append(part);
      return;
    }
    if (typeof part === "string") {
      line.append(part);
      return;
    }
    const mark = document.createElement("i");
    mark.className = part.className;
    mark.textContent = part.text;
    line.append(mark);
  });
  return line;
}

function lossParts(event, side, name, parts) {
  const hpLoss = logDamage(event, side, "hp");
  const spLoss = logDamage(event, side, "sp");
  if (hpLoss > 0) parts.push({ text: `${name} HP -${formatNumber(hpLoss)}`, className: "dmg-hp" });
  if (spLoss > .5) parts.push({ text: `${name} SP -${formatNumber(spLoss)}`, className: "dmg-sp" });
  return parts;
}

function addLog(event) {
  if (event.type === "round_end" || event.type === "sp_leader_change") return;
  const empty = $(".empty-log");
  if (empty) empty.remove();
  const item = document.createElement("div");
  item.className = `log-item ${event.type}`;
  const meta = document.createElement("div");
  meta.className = "log-meta";
  const round = document.createElement("span");
  round.textContent = `第 ${Math.max(1, event.round)} 回合`;
  const tick = document.createElement("span");
  tick.textContent = `TICK ${event.tick}`;
  meta.append(round, tick);
  const text = document.createElement("p");
  text.textContent = event.description;
  item.append(meta, text);

  if (event.type === "attack") {
    const defense = defenseNames[event.defense] || event.defense;
    const parts = [defenseLabel(defense, event.success), `成功率 ${(event.defense_rate * 100).toFixed(1)}%`];
    lossParts(event, event.defender, event.defender_name, parts);
    lossParts(event, event.attacker, event.attacker_name, parts);
    item.append(resultLine(parts));
  } else if (event.type === "clash") {
    const parts = [];
    event.participant_names.forEach((name, index) => {
      lossParts(event, event.participants[index], name, parts);
    });
    if (parts.length) item.append(resultLine(parts));
  }
  $("#battle-log").append(item);
  $("#battle-log").scrollTop = $("#battle-log").scrollHeight;
}

// 飘字时长（1× 速度下的毫秒数），与 CSS 中 float-up 的 2.1s 对齐。
const FLOAT_LIFETIME = 2200;
// 同一侧、同一类型的飘字允许叠加，最多再往下错开两层，避免新旧飘字互相顶掉。
const FLOAT_STACK_LIMIT = 2;
const FLOAT_STACK_GAP = 34;
const liveFloats = { a: new Map(), b: new Map() };

function pruneFloats(key) {
  const bucket = liveFloats[key];
  for (const node of [...bucket.keys()]) {
    if (!node.isConnected) bucket.delete(node);
  }
}

// 计算本条飘字的堆叠序号：同类型仍在飘的数量决定它向下错开多少。
function stackOffset(key, type) {
  const bucket = liveFloats[key];
  let alive = 0;
  for (const [node, nodeType] of bucket) {
    if (node.isConnected && nodeType === type) alive += 1;
  }
  return Math.min(alive, FLOAT_STACK_LIMIT) * FLOAT_STACK_GAP;
}

function showFloat(side, content, type) {
  const key = side.toLowerCase();
  pruneFloats(key);
  const label = document.createElement("span");
  label.className = `float-text ${type}`;
  label.dataset.floatType = type;
  label.style.setProperty("--stack-y", `${stackOffset(key, type)}px`);
  if (content instanceof Node) label.append(content);
  else label.append(document.createTextNode(content));
  $(`#float-${key}`).append(label);
  liveFloats[key].set(label, type);
  const remove = () => {
    label.remove();
    liveFloats[key].delete(label);
  };
  label.addEventListener("animationend", (event) => {
    if (event.target === label) remove();
  }, { once: true });
  window.setTimeout(remove, FLOAT_LIFETIME / player.speed);
}

function spawnEffect(type, side) {
  const target = $(`#combatant-${side.toLowerCase()}`);
  const field = $("#battlefield");
  const effect = document.createElement("span");
  effect.className = type;
  const width = type === "spark" ? 16 : type === "parry-arc" ? 140 : 125;
  const height = type === "parry-arc" ? 70 : type === "spark" ? 16 : 125;
  effect.style.left = `${target.offsetLeft + target.offsetWidth * .55 - width / 2}px`;
  effect.style.top = `${target.offsetTop + target.offsetHeight * .39 - height / 2}px`;
  field.querySelector("#effect-layer").append(effect);
  window.setTimeout(() => effect.remove(), 900 / player.speed);
}

function applyStateChanges(event) {
  if (!event.after) return;
  for (const [side, after] of Object.entries(event.after)) {
    const key = sideKey(side);
    const before = event.before?.[side] || player.states[key];
    updatePanel(key, after);
    const hpLoss = Math.max(0, (before?.hp ?? after.hp) - after.hp);
    const spLoss = Math.max(0, (before?.sp ?? after.sp) - after.sp);
    const courageChange = after.courage - (before?.courage ?? after.courage);
    if (hpLoss > .05) {
      showFloat(key, `-${formatNumber(hpLoss)}`, "damage");
      $(`#combatant-${key}`).classList.add("hit");
    }
    if (spLoss > .5) showFloat(key, `-${formatNumber(spLoss)}`, "sp-cost");
    if (courageChange !== 0) showFloat(key, `${courageChange > 0 ? "+" : ""}${Math.round(courageChange)}`, "courage-change");
    if (after.alive === false) $(`#combatant-${key}`).classList.add("dead");
  }
}

const rawDelay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function waitForPlayback(milliseconds, generation) {
  let remaining = milliseconds;
  let previous = performance.now();
  while (remaining > 0) {
    if (generation !== player.generation) return false;
    await rawDelay(Math.min(45, Math.max(10, milliseconds / player.speed / 5)));
    const now = performance.now();
    if (player.playing) remaining -= (now - previous) * player.speed;
    previous = now;
  }
  return generation === player.generation;
}

async function playAttack(event, generation) {
  clearCombatClasses();
  addLog(event);
  $("#round-label").textContent = `第 ${event.round} 回合`;
  $("#tick-label").textContent = `模拟时刻 ${event.tick}`;
  const defense = defenseNames[event.defense] || event.defense;
  setAction(`${event.attacker_name} 进攻 → ${event.defender_name} ${defense}${event.success ? "成功" : "失败"}`);
  const attacker = $(`#combatant-${event.attacker.toLowerCase()}`);
  const defender = $(`#combatant-${event.defender.toLowerCase()}`);
  attacker.classList.add("attack");
  defender.classList.add(event.defense);
  if (!await waitForPlayback(245, generation)) return;
  spawnEffect("slash", event.defender);
  if (event.defense === "block" || event.defense === "counter") spawnEffect("spark", event.defender);
  if (event.defense === "parry") spawnEffect("parry-arc", event.defender);
  showFloat(event.defender, defenseLabel(defense, event.success), "defense-label");
  applyStateChanges(event);
  if (event.damage_to_attacker > 0 && event.defense === "counter") spawnEffect("slash", event.attacker);
  await waitForPlayback(590, generation);
}

async function playClash(event, generation) {
  clearCombatClasses();
  addLog(event);
  $("#round-label").textContent = `第 ${event.round} 回合`;
  $("#tick-label").textContent = `模拟时刻 ${event.tick}`;
  setAction(`拼刀！${event.participant_names.join(" 对阵 ")}`);
  for (const side of event.participants) $(`#combatant-${side.toLowerCase()}`).classList.add("clash");
  if (!await waitForPlayback(310, generation)) return;
  const ring = document.createElement("span");
  ring.className = "clash-ring";
  $("#effect-layer").append(ring);
  window.setTimeout(() => ring.remove(), 900 / player.speed);
  for (const side of event.participants) spawnEffect("spark", side);
  applyStateChanges(event);
  await waitForPlayback(650, generation);
}

function showResult() {
  if (!player.battle) return;
  const result = player.battle.result;
  let title = "双方战平";
  if (result.winner) {
    const warrior = player.battle.warriors.find((item) => item.side === result.winner);
    title = `${warrior.name} 获胜`;
  }
  $("#result-title").textContent = title;
  const outcome = result.outcome === "timeout" ? "超时判定 · " : "";
  $("#result-detail").textContent = `${outcome}共 ${result.rounds} 回合 · ${result.ticks} 个模拟刻度 · 种子 ${player.battle.seed}`;
  $("#result-overlay").hidden = false;
}

async function playEvent(event, generation) {
  if (event.type === "battle_start") {
    addLog(event);
    setAction(`${player.battle.warriors[0].name} 对阵 ${player.battle.warriors[1].name}`);
    await waitForPlayback(420, generation);
  } else if (event.type === "attack") {
    await playAttack(event, generation);
  } else if (event.type === "clash") {
    await playClash(event, generation);
  } else if (event.type === "round_end") {
    $("#round-label").textContent = `第 ${event.round + 1} 回合`;
  } else if (event.type === "battle_end" || event.type === "timeout") {
    addLog(event);
    setAction(event.description);
    showResult();
    await waitForPlayback(250, generation);
  }
}

async function startPlayback() {
  if (!player.battle) return;
  if (player.index >= player.battle.events.length) resetPlayback();
  player.playing = true;
  document.body.classList.remove("paused");
  updateControls();
  if (player.runActive) return;
  player.runActive = true;
  const generation = ++player.generation;
  try {
    while (player.index < player.battle.events.length && generation === player.generation) {
      const event = player.battle.events[player.index];
      try {
        await playEvent(event, generation);
      } catch (eventError) {
        // 单个特效异常不得中断后续事件；状态仍以战报快照为准。
        console.error("战斗事件演出异常，继续按战报推进", eventError);
        for (const [side, state] of Object.entries(event.after || {})) {
          try { updatePanel(side, state); } catch (stateError) { console.error(stateError); }
        }
        if (!player.animationErrorShown) {
          player.animationErrorShown = true;
          showToast("个别动作特效异常，已按战报数据继续播放");
        }
      }
      if (generation !== player.generation) return;
      player.index += 1;
      updateTimeline();
      updateControls(); // 让「上一步」随进度即时可用
    }
  } catch (error) {
    console.error("播放队列异常", error);
    showToast("播放队列异常，请重播；战报数据保持完整");
  } finally {
    if (generation === player.generation) {
      player.runActive = false;
      player.playing = false;
      updateControls();
    }
  }
}

function pausePlayback() {
  player.playing = false;
  document.body.classList.add("paused");
  setAction("演出已暂停");
  updateControls();
}

// ===== 回退 / 进度定位 =====
// 战报每个事件都带 before/after 快照，所以"后退"不是倒放动画，
// 而是把面板、战报、回合标签一次性重建到第 index 个事件之前的状态。

function clampIndex(index) {
  const total = player.battle?.events.length || 0;
  return Math.max(0, Math.min(total, index));
}

// 汇总到第 limit 个事件为止的双方快照（不含 limit 本身）。
function statesAtIndex(limit) {
  const states = {};
  const events = player.battle?.events || [];
  for (let i = 0; i < Math.min(limit, events.length); i += 1) {
    const after = events[i].after;
    if (!after) continue;
    for (const [side, state] of Object.entries(after)) {
      const key = sideKey(side);
      states[key] = { ...(states[key] || {}), ...state };
    }
  }
  return states;
}

// 回放标签用的回合/刻度/最近一句动作描述。
function readProgress(limit) {
  const events = player.battle?.events || [];
  let round = 1;
  let tick = 0;
  let action = "";
  for (let i = 0; i < Math.min(limit, events.length); i += 1) {
    const event = events[i];
    if (event.type === "round_end") round = (event.round || 0) + 1;
    else if (Number.isFinite(event.round)) round = event.round;
    if (Number.isFinite(event.tick)) tick = event.tick;
    if (event.description) action = event.description;
  }
  return { round, tick, action };
}

function paintProgressLabels(target) {
  const total = player.battle?.events.length || 0;
  const { round, tick, action } = readProgress(target);
  $("#round-label").textContent = `第 ${round} 回合`;
  $("#tick-label").textContent = target > 0 ? `模拟时刻 ${tick}` : "模拟待启动";
  if (target <= 0) setAction("双方策马入场");
  else if (target >= total) setAction(action || "已跳转至最终结算");
}

// 拖动过程中的轻量预览：只刷数值条与标签，不重建战报列表。
function previewTo(index) {
  if (!player.battle) return;
  const target = clampIndex(index);
  const states = statesAtIndex(target);
  suppressBarFlash = true;
  player.states = {};
  for (const side of ["a", "b"]) updatePanel(side, player.battle.initial_states[side.toUpperCase()]);
  for (const [key, state] of Object.entries(states)) {
    updatePanel(key, state);
    $(`#combatant-${key}`).classList.toggle("dead", state.alive === false);
  }
  suppressBarFlash = false;
  $("#result-overlay").hidden = true;
  player.index = target;
  paintProgressLabels(target);
  const total = player.battle.events.length;
  setAction(`拖动定位 · 第 ${target} / ${total} 个事件`);
  updateTimeline();
}

// 完整重建到第 index 个事件之前：面板 + 战报 + 标签 + 控制按钮。
function rebuildTo(index) {
  if (!player.battle) return;
  const total = player.battle.events.length;
  const target = clampIndex(index);
  cancelPlayback();
  clearCombatClasses();
  $("#effect-layer").replaceChildren();
  $("#battle-log").replaceChildren();
  $("#result-overlay").hidden = true;
  for (const key of ["a", "b"]) {
    $(`#combatant-${key}`).classList.remove("dead");
    $(`#float-${key}`).replaceChildren();
    liveFloats[key].clear();
  }
  player.states = {};
  suppressBarFlash = true;
  for (const side of ["a", "b"]) {
    updatePanel(side, player.battle.initial_states[side.toUpperCase()]);
  }
  for (let i = 0; i < target; i += 1) {
    const event = player.battle.events[i];
    addLog(event);
    if (!event.after) continue;
    for (const [side, state] of Object.entries(event.after)) {
      const key = sideKey(side);
      updatePanel(key, state);
      $(`#combatant-${key}`).classList.toggle("dead", state.alive === false);
    }
  }
  suppressBarFlash = false;
  player.index = target;
  if (!target) {
    const empty = document.createElement("div");
    empty.className = "empty-log";
    empty.textContent = "战报将随动作同步展开";
    $("#battle-log").append(empty);
  }
  paintProgressLabels(target);
  if (target > 0 && target < total) {
    const { action } = readProgress(target);
    setAction(`${action}（第 ${target} / ${total} 个事件）`);
  }
  $("#battle-log").scrollTop = $("#battle-log").scrollHeight;
  if (total > 0 && target >= total) showResult();
  updateControls();
  updateTimeline();
}

function stepBack() {
  if (!player.battle || player.index <= 0) return;
  const wasPlaying = player.playing;
  rebuildTo(player.index - 1);
  setAction(wasPlaying ? "已回退一步，按继续接着播" : "已回退一步");
}

function skipToResult() {
  if (!player.battle) return;
  rebuildTo(player.battle.events.length);
  setAction("已跳转至最终结算");
}

function battlePayloadFromForm() {
  const data = new FormData($("#setup-form"));
  const warrior = (side) => ({
    name: data.get(`${side}-name`),
    martialarts: Number(data.get(`${side}-martialarts`)),
    agility: Number(data.get(`${side}-agility`)),
    strength: Number(data.get(`${side}-strength`)),
    courage: Number(data.get(`${side}-courage`)),
    sp: Number(data.get(`${side}-sp`)),
  });
  return { seed: Number(data.get("seed")), warriors: { a: warrior("a"), b: warrior("b") } };
}

async function requestBattle(payload) {
  cancelPlayback();
  $("#loading").classList.remove("hidden");
  $("#setup-error").textContent = "";
  $("#generate-button").disabled = true;
  try {
    const response = await fetch("/api/battle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "战报生成失败");
    player.battle = data;
    for (const warrior of data.warriors) {
      const side = warrior.side.toLowerCase();
      $(`#name-${side}`).textContent = warrior.name;
      $(`#unit-name-${side}`).textContent = warrior.name;
      $(`#avatar-${side}`).textContent = [...warrior.name][0] || "将";
    }
    $("#seed-label").textContent = `SEED ${data.seed} · ${data.events.length} EVENTS`;
    resetPlayback();
    $("#setup-dialog").close();
    startPlayback();
  } catch (error) {
    $("#setup-error").textContent = error.message;
    showToast(`${error.message}。请确认已通过 web_server.py 启动网页。`);
  } finally {
    $("#loading").classList.add("hidden");
    $("#generate-button").disabled = false;
    updateControls();
  }
}

let toastTimer;
function showToast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => $("#toast").classList.remove("show"), 3600);
}

function openSetup(randomize = false) {
  if (randomize) $("#setup-form [name=seed]").value = Math.floor(Math.random() * 2147483646) + 1;
  $("#setup-error").textContent = "";
  $("#setup-dialog").showModal();
}

$("#start-button").addEventListener("click", startPlayback);
$("#pause-button").addEventListener("click", pausePlayback);
$("#back-button").addEventListener("click", stepBack);
$("#replay-button").addEventListener("click", () => { resetPlayback(); startPlayback(); });
$("#result-replay").addEventListener("click", () => { resetPlayback(); startPlayback(); });
$("#skip-button").addEventListener("click", skipToResult);

// ===== 时间轴拖动（可前可后）=====
const timelineEl = $("#timeline");
let scrubbing = false;

function timelineIndexAt(clientX) {
  const rect = timelineEl.getBoundingClientRect();
  if (!rect.width) return 0;
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const total = player.battle?.events.length || 0;
  return Math.round(ratio * total);
}

let lastScrubAt = 0;

function endScrub(clientX) {
  if (!scrubbing) return;
  scrubbing = false;
  timelineEl.classList.remove("scrubbing");
  lastScrubAt = Date.now();
  rebuildTo(timelineIndexAt(clientX));
  setAction(`已定位到第 ${player.index} / ${player.battle.events.length} 个事件`);
}

// 单击也能定位：不依赖指针事件的设备（或触控板轻点）同样可用。
timelineEl.addEventListener("click", (event) => {
  if (!player.battle || Date.now() - lastScrubAt < 300) return;
  pausePlayback();
  rebuildTo(timelineIndexAt(event.clientX));
  setAction(`已定位到第 ${player.index} / ${player.battle.events.length} 个事件`);
});

timelineEl.addEventListener("pointerdown", (event) => {
  if (!player.battle) return;
  event.preventDefault();
  scrubbing = true;
  timelineEl.classList.add("scrubbing");
  try { timelineEl.setPointerCapture(event.pointerId); } catch (error) { console.warn("时间轴指针捕获失败", error); }
  pausePlayback(); // 拖动即暂停，避免和播放队列抢面板状态
  previewTo(timelineIndexAt(event.clientX));
});
timelineEl.addEventListener("pointermove", (event) => {
  if (!scrubbing) return;
  previewTo(timelineIndexAt(event.clientX));
});
timelineEl.addEventListener("pointerup", (event) => endScrub(event.clientX));
timelineEl.addEventListener("pointercancel", (event) => endScrub(event.clientX));

timelineEl.addEventListener("keydown", (event) => {
  if (!player.battle) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  rebuildTo(player.index + (event.key === "ArrowRight" ? 1 : -1));
});

// ← / → 逐事件后退与前进（输入框与弹窗内不拦截）
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || !player.battle || $("#setup-dialog").open) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepBack();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    rebuildTo(player.index + 1);
  }
});
$("#setup-button").addEventListener("click", () => openSetup(false));
$("#result-new").addEventListener("click", () => openSetup(true));
$("#close-dialog").addEventListener("click", () => $("#setup-dialog").close());
$("#setup-dialog").addEventListener("click", (event) => {
  if (event.target === $("#setup-dialog")) $("#setup-dialog").close();
});
$("#setup-form").addEventListener("submit", (event) => {
  event.preventDefault();
  requestBattle(battlePayloadFromForm());
});

$$(".speed-button").forEach((button) => button.addEventListener("click", () => {
  player.speed = Number(button.dataset.speed);
  document.documentElement.style.setProperty("--duration-factor", 1 / player.speed);
  $$(".speed-button").forEach((item) => item.classList.toggle("active", item === button));
}));

$("#export-button").addEventListener("click", () => {
  if (!player.battle) return;
  const blob = new Blob([JSON.stringify(player.battle, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `battle-${player.battle.seed}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("JSON 战报已导出");
});

const query = new URLSearchParams(window.location.search);
const requestedSeed = Number(query.get("seed"));
const requestedSpeed = Number(query.get("speed"));
const initialPayload = {
  seed: Number.isSafeInteger(requestedSeed) && requestedSeed > 0 ? requestedSeed : 42,
  warriors: {
    a: { name: "马超", martialarts: 98, agility: 95, strength: 92, courage: 94, sp: 98 },
    b: { name: "许褚", martialarts: 95, agility: 80, strength: 99, courage: 96, sp: 100 },
  },
};
if ([1, 2, 4].includes(requestedSpeed)) {
  player.speed = requestedSpeed;
  document.documentElement.style.setProperty("--duration-factor", 1 / requestedSpeed);
  $$(".speed-button").forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === requestedSpeed));
}
requestBattle(initialPayload);

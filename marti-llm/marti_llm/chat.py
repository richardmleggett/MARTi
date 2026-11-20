"""
Interactive chat about the samples open in the MARTi GUI (the Compare page or one sample's dashboard).

The GUI server starts this once per question and passes everything on stdin as JSON, so nothing about the user's
data or conversation appears on the command line:

    {"page": "compare" | "dashboard",
     "samples": [{"dir": "<folder with sample.json>", "ref": {"runId": "...", "name": "..."},
                  "label": "<name the user gave it in this browser, optional>"}],
     "groups": {"<group>": ["<folder>", ...]},            # the groups set on the Compare page, optional
     "view": {"tab": "Diversity", "rank": "genus", "minSupport": 0.1},   # what the user is looking at, optional
     "links": [{"id": "diversity-table", "description": "..."}],         # GUI places the model may link to
     "messages": [{"role": "user" | "assistant", "content": "..."}]}     # the conversation, last one is the question

The model can only use the analysis tools, and only on those samples. Progress comes back as one JSON object per
line: {"event": "tool", ...} for each analysis run, then {"event": "done", "answer": ...} or {"event": "error"}.
The API key comes from MARTI_LLM_API_KEY, as for marti_llm.narrate.
"""
from __future__ import annotations

import argparse
import inspect
import json
import os
import re
import sys
import types
import typing
from pathlib import Path
from urllib.parse import quote

import httpx

from marti_llm import tools as T
from marti_llm.data import MartiStore, Sample
from marti_llm.narrate import sample_from_dir
from marti_llm.providers import LLMConfig, ProviderError, _headers, _raise_for

MAX_TURNS = 12                 # model calls per question
MAX_TOOL_RESULT = 24000        # characters of one tool result passed back to the model
MAX_HISTORY_MESSAGES = 20
MAX_HISTORY_CHARS = 40000
MAX_ANSWER_TOKENS = 2000
HIDDEN_PARAMS = {"project", "reference_project"}     # the chat sees only the samples on screen, not projects


# ------------------------------------------------------------------------------------------------ scoped data
class ScopedStore(MartiStore):
    """Only the samples the user has open, so the model cannot look at (or mention) anything else."""

    def __init__(self, sample_dirs: list[str | Path]):
        super().__init__([])
        self._samples: list[Sample] = []
        seen = set()
        for d in sample_dirs:
            s = sample_from_dir(d)
            if s.key not in seen:
                seen.add(s.key)
                self._samples.append(s)

    def samples(self) -> list[Sample]:
        return list(self._samples)

    def projects(self) -> dict[str, dict]:
        return {}

    def project_samples(self, project: str) -> list[Sample]:
        raise KeyError("Projects are not available here; the analyses use the samples open in the GUI.")


# ------------------------------------------------------------------------------------------------ tool schemas
def _schema_for(tp) -> dict:
    origin = typing.get_origin(tp)
    args = typing.get_args(tp)
    if origin in (typing.Union, types.UnionType):
        inner = [a for a in args if a is not type(None)]
        return _schema_for(inner[0]) if len(inner) == 1 else {}
    if origin is list:
        return {"type": "array", "items": _schema_for(args[0]) if args else {}}
    if origin is dict:
        return {"type": "object", "additionalProperties": _schema_for(args[1]) if len(args) == 2 else {}}
    return {str: {"type": "string"}, int: {"type": "integer"}, float: {"type": "number"},
            bool: {"type": "boolean"}}.get(tp, {})


def tool_schema(fn) -> dict:
    hints = typing.get_type_hints(fn)
    props, required = {}, []
    for name, p in inspect.signature(fn).parameters.items():
        if name in HIDDEN_PARAMS:
            continue
        sch = dict(_schema_for(hints.get(name, str)))
        if p.default is inspect.Parameter.empty:
            required.append(name)
        elif p.default is not None:
            sch["default"] = p.default
        props[name] = sch
    desc = inspect.getdoc(fn) or ""
    desc = re.sub(r"\s*\(?optionally only those in a project from projects\.json\)?", "", desc)
    return {"name": fn.__name__, "description": desc,
            "schema": {"type": "object", "properties": props, "required": required}}


def chat_tools() -> list[tuple]:
    return [(fn, title, tool_schema(fn)) for fn, title in T.READ_TOOLS]


# ------------------------------------------------------------------------------------------------ prompt
GUIDANCE = """\
How to work:
- Use the tools for every count, percentage and statistic; never estimate or compute them yourself. Call
  sample_overview before interpreting a sample you have not looked at yet.
- Abundances are read-based and relative. Trees exist at several minimum-support thresholds (min_support, % of
  reads): 0.0 is unfiltered and best for screening for low-level organisms; 0.1 is the GUI default. Unless the
  question needs otherwise, use the rank and minimum support the user is viewing, and say when you use others.
- Diversity and distance results reproduce the GUI's own calculations, so the user can check them on screen.
- Taxonomic hits are evidence of sequence similarity, not viability, serotype or virulence. Call low-read and
  closely-related-group calls presumptive. Detection depends on the database and sequencing depth.
- Group tests are permutation tests: give group sizes, and treat results from very small groups as descriptive.
- If the question cannot be answered from these results, say so briefly and suggest what would answer it.
- When the user asks to open, show or go to a plot or table (including one for a named sample), call open_view
  and answer in a sentence; the GUI goes there when you answer. Do not describe the plot's contents unless asked.

How to answer: this is a chat panel beside the plots, so be brief and specific: usually two to four short
paragraphs or a short list. Plain sentences, **bold** only for the key finding, no headings or tables. Quote the
numbers the tools return. Do not offer long follow-up menus; at most suggest one next question."""

LINKS = """\
Links into the GUI: help the user see the data behind what you say by linking to it, written as
[link text](marti:<target>). Use only these targets:
{targets}
- sample/<sample key>: opens that sample's dashboard (sample keys as listed above or given by the tools)
Link the words that name the result, e.g. "Shannon diversity is higher at [site A](marti:diversity-plot)". Use a
few links where they help, not on every sentence, and never invent other targets or web links."""


def _sample_line(s: Sample, label: str, group: str | None) -> str:
    md = s.metadata() or {}
    from marti_llm.groups import metadata_date, metadata_location
    bits = [f"key {s.key}"]
    if label and label != s.name:
        bits.append(f"the user calls it '{label}'")
    for k, v in (("date", metadata_date(md)), ("location", metadata_location(md)), ("group", group)):
        if v:
            bits.append(f"{k} {v}")
    return f"- {s.name} ({'; '.join(bits)})"


SAMPLES_PAGE = """\
On this page the user finds and selects samples (the selection is what the Compare page compares).
- To find samples, use find_samples; it does the matching, so never decide from memory which samples qualify.
- "Select ..." means: find the samples, then call select_samples with their keys (mode "replace", or "add" or
  "remove" when the user says so, e.g. "also select" or "deselect"). The table updates when you answer. Only call
  select_samples when the user asks to select, add or remove; "list", "show" or "which" questions just answer.
- When listing samples, link each one: [name](marti:sample/<key>). Summarise rather than list when there are more
  than about 20.
- Always say how you read the request: the dates used (seasons are meteorological: spring March-May, summer
  June-August, autumn September-November, winter December-February of the year given, winter running into the
  next year), the taxon threshold, and distances in the user's units.
- Taxon searches use the lowest non-zero minimum abundance threshold each sample has unless the user asks for a
  threshold (then pass it as min_support in %, or min_percent for a share of classified reads).
- Distances use coordinates written in the sample metadata. For locations without them, you may estimate
  coordinates from the place name (pass estimated_coordinates) only if you know the place; then say clearly
  which samples were placed by estimate and that their distances are approximate. Never present an estimate
  as recorded. If you do not know where a place is, say so rather than guessing."""


def _samples_page_summary(samples: list[Sample], selected: set[str]) -> str:
    from collections import Counter
    from marti_llm.analysis import location_name, sample_coordinates
    from marti_llm.groups import metadata_date, metadata_keywords
    runs = Counter(s.run_id for s in samples)
    dates = sorted(d for d in (metadata_date(s.metadata() or {}) for s in samples) if re.match(r"\d{4}-", d or ""))
    locs = Counter(location_name(s.metadata() or {}) or
                   ("(coordinates only)" if sample_coordinates(s.metadata()) else "(none)") for s in samples)
    with_coords = sum(1 for s in samples if sample_coordinates(s.metadata()))
    kws = Counter(k for s in samples for k in metadata_keywords(s.metadata() or {}))
    lines = [f"The user is on the Samples page, which lists {len(samples)} samples from {len(runs)} runs.",
             "Runs: " + ", ".join(f"{r} ({n})" for r, n in sorted(runs.items())[:60]),
             (f"Collection dates from {dates[0]} to {dates[-1]} ({len(dates)} samples dated)." if dates
              else "No samples have collection dates."),
             "Locations: " + ", ".join(f"{l} ({n})" for l, n in locs.most_common(60)),
             f"{with_coords} samples have coordinates in their metadata."]
    if kws:
        lines.append("Keywords: " + ", ".join(f"{k} ({n})" for k, n in kws.most_common(40)))
    if selected:
        names = sorted(s.key for s in samples if s.key in selected)
        lines.append(f"Currently selected: {len(names)} samples" +
                     (": " + ", ".join(names) if len(names) <= 30 else "") + ".")
    else:
        lines.append("No samples are selected at the moment.")
    lines.append("Use list_samples for the full list with details.")
    return "\n".join(lines)


def build_system(ctx: dict, store: ScopedStore, labels: dict, groups: dict[str, list[str]],
                 selected: set[str] | None = None) -> str:
    samples = store.samples()
    group_of = {k: g for g, keys in groups.items() for k in keys}
    intro = ("You are the AI assistant built into the MARTi GUI (Metagenomic Analysis in Real Time). You help the "
             "user interpret the sequencing results open in front of them, using the analysis tools provided. The "
             "tools can only see these samples.")
    if ctx.get("page") == "samples":
        parts = [intro, _samples_page_summary(samples, selected or set()), SAMPLES_PAGE]
    else:
        if ctx.get("page") == "dashboard":
            where = "The user is looking at the dashboard of one sample:"
        else:
            where = f"The user is on the Compare page, comparing these {len(samples)} samples:"
        lines = [_sample_line(s, labels.get(s.key, ""), group_of.get(s.key)) for s in samples]
        parts = [intro, where + "\n" + "\n".join(lines)]
    if groups:
        parts.append("The user has put the samples into groups (shown above). When comparing groups, pass them "
                     "to the tools as groups=" + json.dumps(groups) + ".")
    view = ctx.get("view") or {}
    seen = []
    if view.get("tab"):
        seen.append(f"the {view['tab']} tab")
    if view.get("rank"):
        seen.append(f"rank {view['rank']}")
    if view.get("minSupport") is not None:
        seen.append(f"minimum support {view['minSupport']}%")
    if seen:
        parts.append("They are currently viewing " + ", ".join(seen) + ".")
    parts.append(GUIDANCE)
    targets = [t for t in (ctx.get("links") or []) if isinstance(t, dict) and _target_ok(t.get("id"))]
    if targets:
        parts.append(LINKS.format(targets="\n".join(f"- {t['id']}: {str(t.get('description', ''))[:200]}"
                                                    for t in targets[:40])))
    return "\n\n".join(parts)


def _target_ok(t) -> bool:
    return isinstance(t, str) and re.fullmatch(r"[a-z][a-z0-9-]{0,40}", t) is not None


# ------------------------------------------------------------------------------------------------ answer tidy-up
LINK_RE = re.compile(r"\[([^\]\n]{1,200})\]\(\s*(marti:[^)\s]+|[a-z]+://[^)\s]+)\s*\)")


def clean_answer(text: str, store: ScopedStore, allowed: set[str], refs: dict[str, dict]) -> str:
    """Strip reasoning blocks; keep only links to known GUI places (sample links become the GUI's own ids)."""
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S).strip()

    def fix(m):
        label, target = m.group(1), m.group(2)
        if not target.startswith("marti:"):
            return label
        t = target[len("marti:"):]
        if t in allowed:
            return f"[{label}](marti:{t})"
        if t.startswith("sample/"):
            try:
                s = store.get(t[len("sample/"):])
            except (KeyError, ValueError):
                return label
            ref = refs.get(s.key)
            if ref:
                return f"[{label}](marti:sample/{quote(ref['runId'], safe='')}/{quote(ref['name'], safe='')})"
        return label
    return LINK_RE.sub(fix, text)


# ------------------------------------------------------------------------------------------------ providers
class _Conversation:
    """The message list in one provider's format, with tool calls."""

    def __init__(self, cfg: LLMConfig, system: str, history: list[dict], tools: list[dict]):
        self.cfg = cfg
        self.anthropic = cfg.provider == "anthropic"
        if self.anthropic:
            self.tools = [{"name": t["name"], "description": t["description"], "input_schema": t["schema"]}
                          for t in tools]
            self.system = system
            self.messages = [{"role": m["role"], "content": m["content"]} for m in history]
        else:
            self.tools = [{"type": "function", "function": {"name": t["name"], "description": t["description"],
                                                             "parameters": t["schema"]}} for t in tools]
            self.messages = [{"role": "system", "content": system}] + \
                [{"role": m["role"], "content": m["content"]} for m in history]

    def step(self, client: httpx.Client, allow_tools: bool = True) -> tuple[str, list[tuple[str, str, dict]], dict]:
        cfg = self.cfg
        if self.anthropic:
            # tools stay declared on the last turn (earlier tool_use blocks need them) but cannot be called
            payload = {"model": cfg.model, "max_tokens": MAX_ANSWER_TOKENS, "system": self.system,
                       "messages": self.messages, "tools": self.tools}
            if not allow_tools:
                payload["tool_choice"] = {"type": "none"}
            r = client.post(f"{cfg.base_url}/v1/messages", headers=_headers(cfg), json=payload)
            _raise_for(r, cfg)
            body = r.json()
            content = body.get("content") or []
            self.messages.append({"role": "assistant", "content": content})
            text = "".join(b.get("text", "") for b in content if b.get("type") == "text")
            calls = [(b["id"], b["name"], b.get("input") or {}) for b in content if b.get("type") == "tool_use"]
            u = body.get("usage") or {}
            return text, calls, {"input_tokens": u.get("input_tokens"), "output_tokens": u.get("output_tokens")}
        payload = {"model": cfg.model, "messages": self.messages, "tools": self.tools}
        if not allow_tools:
            payload["tool_choice"] = "none"
        payload["max_completion_tokens" if cfg.provider == "openai" else "max_tokens"] = MAX_ANSWER_TOKENS
        r = client.post(f"{cfg.base_url}/chat/completions", headers=_headers(cfg), json=payload)
        _raise_for(r, cfg)
        body = r.json()
        msg = (body.get("choices") or [{}])[0].get("message") or {}
        keep = {"role": "assistant", "content": msg.get("content") or ""}
        if msg.get("tool_calls"):
            keep["tool_calls"] = msg["tool_calls"]
        self.messages.append(keep)
        calls = []
        for tc in msg.get("tool_calls") or []:
            fn = tc.get("function") or {}
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {"__invalid__": fn.get("arguments")}
            calls.append((tc.get("id") or fn.get("name", ""), fn.get("name", ""), args if isinstance(args, dict) else {}))
        u = body.get("usage") or {}
        return msg.get("content") or "", calls, {"input_tokens": u.get("prompt_tokens"),
                                                 "output_tokens": u.get("completion_tokens")}

    def add_results(self, results: list[tuple[str, str]]):
        if self.anthropic:
            self.messages.append({"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": cid, "content": out} for cid, out in results]})
        else:
            for cid, out in results:
                self.messages.append({"role": "tool", "tool_call_id": cid, "content": out})

    def ask_to_finish(self):
        note = ("You have used all the analysis steps available for this question. Answer now from the results you "
                "have, and say what is still unchecked.")
        if self.anthropic and isinstance(self.messages[-1]["content"], list):
            self.messages[-1]["content"].append({"type": "text", "text": note})
        else:
            self.messages.append({"role": "user", "content": note})


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(text).lower())


def match_listed_sample(query: str, listed: list[dict]) -> tuple[dict | None, list[dict]]:
    """A sample from the GUI's list ({runId, name}) by "run/name", name, or a unique part of the name.
    Returns (sample, []) or (None, candidates)."""
    q = str(query or "").strip()
    if not q:
        return None, []
    exact = [s for s in listed if f"{s['runId']}/{s['name']}".lower() == q.lower() or s["name"].lower() == q.lower()]
    if len(exact) == 1:
        return exact[0], []
    if exact:
        return None, exact
    nq = _norm(q)
    same = [s for s in listed if _norm(s["name"]) == nq or _norm(f"{s['runId']}{s['name']}") == nq]
    if len(same) == 1:
        return same[0], []
    part = same or [s for s in listed if nq and nq in _norm(f"{s['runId']}/{s['name']}")]
    if len(part) == 1:
        return part[0], []
    return None, part


def _open_tool(page: str, page_links: list[dict], dashboard_links: list[dict], listed: list[dict],
               actions: list[dict]):
    """open_view, on every page: records where the GUI should take the user when the answer arrives."""
    page_ids = [t["id"] for t in page_links]
    dash_ids = [t["id"] for t in dashboard_links]

    def open_view(target: str, sample: str | None = None) -> dict:
        """Open a plot or table in the GUI for the user."""
        if sample:
            ref, candidates = match_listed_sample(sample, listed)
            if ref is None:
                if candidates:
                    return {"error": f"'{sample}' matches more than one sample; ask the user which, or use the full "
                                     "name.", "candidates": [f"{c['runId']}/{c['name']}" for c in candidates[:15]]}
                return {"error": f"No sample called '{sample}' is listed in the GUI. On the Samples page, "
                                 "find_samples or list_samples give the names."}
            if target not in dash_ids:
                return {"error": f"'{target}' is not a dashboard view. Dashboard views: {dash_ids}."}
            actions.append({"type": "open", "page": "dashboard", "target": target,
                            "sample": {"runId": ref["runId"], "name": ref["name"]}})
            return {"ok": True, "opening": f"{target} on the dashboard of {ref['name']} (run {ref['runId']})",
                    "note": "The GUI opens it when you answer. Say briefly what you opened."}
        if target not in page_ids:
            return {"error": f"'{target}' is not on this page. Views here: {page_ids}"
                             + (f"; for a sample's dashboard pass sample with one of {dash_ids}." if dash_ids else ".")}
        actions.append({"type": "open", "page": page, "target": target})
        return {"ok": True, "opening": target, "note": "The GUI opens it when you answer. Say briefly what you opened."}

    schema = tool_schema(open_view)
    schema["description"] = (
        "Take the user to a plot or table in the GUI (it happens when you answer). Use when they ask to open, "
        "show, go to or view one. target: a view on this page (" + ", ".join(page_ids) + ")" +
        ("; or, with sample (a sample name, or run/name), a view on that sample's dashboard (" +
         ", ".join(dash_ids) + ")" if dash_ids else "") + ". Only the last open_view of an answer is followed.")
    return (open_view, "Open a view", schema)


def _select_tool(store: ScopedStore, refs: dict[str, dict], actions: list[dict]):
    """select_samples for the Samples page: records the selection for the GUI to apply with the answer."""
    def select_samples(samples: list[str], mode: str = "replace") -> dict:
        """Select samples in the Samples page table (the selection the Compare page uses). samples: sample keys,
        e.g. from find_samples. mode: "replace" (default) makes these the whole selection; "add" adds them;
        "remove" deselects them. Call only when the user asks to select, add or remove samples."""
        if mode not in ("replace", "add", "remove"):
            return {"error": 'mode must be "replace", "add" or "remove".'}
        if not isinstance(samples, list):
            return {"error": "samples must be a list of sample keys."}
        keys, unknown = [], []
        for ref in samples:
            try:
                s = store.get(str(ref))
            except (KeyError, ValueError):
                unknown.append(ref)
                continue
            if s.key not in keys:
                keys.append(s.key)
        if unknown:
            return {"error": f"Not samples on this page: {unknown[:10]}. Use keys from find_samples or list_samples."}
        actions.append({"type": "select", "mode": mode,
                        "samples": [refs.get(k) or {"runId": k.split("/")[0], "name": k.split("/")[-1]}
                                    for k in keys]})
        return {"ok": True, "mode": mode, "n_samples": len(keys),
                "note": "The table will show this selection when you answer. Tell the user what was selected and why."}
    return (select_samples, "Select samples", tool_schema(select_samples))


def run_tool(registry: dict, name: str, args: dict) -> str:
    entry = registry.get(name)
    if entry is None:
        return json.dumps({"error": f"Unknown tool '{name}'. Available: {', '.join(sorted(registry))}."})
    fn = entry[0]
    if "__invalid__" in args:
        return json.dumps({"error": "The arguments were not valid JSON; call the tool again."})
    params = inspect.signature(fn).parameters
    unknown = [k for k in args if k not in params or k in HIDDEN_PARAMS]
    if unknown:
        return json.dumps({"error": f"Unknown argument(s) {unknown} for {name}. "
                                    f"Arguments: {[p for p in params if p not in HIDDEN_PARAMS]}."})
    try:
        out = fn(**args)
    except TypeError as e:
        out = {"error": str(e)}
    except Exception as e:   # an analysis bug must not end the conversation
        out = {"error": f"{name} failed: {e.__class__.__name__}: {e}"}
    text = json.dumps(out, separators=(",", ":"), default=str)
    if len(text) > MAX_TOOL_RESULT:
        text = text[:MAX_TOOL_RESULT] + ' ... [truncated: ask for fewer samples, a smaller top_n or a narrower query]'
    return text


def trim_history(messages: list[dict]) -> list[dict]:
    clean = [{"role": m["role"], "content": str(m["content"])} for m in messages
             if isinstance(m, dict) and m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()]
    clean = clean[-MAX_HISTORY_MESSAGES:]
    while len(clean) > 1 and sum(len(m["content"]) for m in clean) > MAX_HISTORY_CHARS:
        clean = clean[1:]
    while clean and clean[0]["role"] != "user":       # providers expect the conversation to start with the user
        clean = clean[1:]
    # merge consecutive messages from the same side (e.g. a question whose answer failed)
    merged: list[dict] = []
    for m in clean:
        if merged and merged[-1]["role"] == m["role"]:
            merged[-1]["content"] += "\n\n" + m["content"]
        else:
            merged.append(dict(m))
    return merged


def answer(ctx: dict, cfg: LLMConfig, emit=lambda e: None) -> dict:
    sample_dirs = [s["dir"] for s in ctx.get("samples") or [] if isinstance(s, dict) and s.get("dir")]
    if not sample_dirs:
        raise ValueError("No samples are open.")
    store = T.configure(ScopedStore(sample_dirs))
    by_dir = {}
    for s in store.samples():
        by_dir[str(s.json_dir)] = s
    refs, labels = {}, {}
    for entry in ctx.get("samples") or []:
        s = by_dir.get(str(Path(entry.get("dir", "")).expanduser().resolve()))
        if s is None:
            continue
        if isinstance(entry.get("ref"), dict):
            refs[s.key] = {"runId": str(entry["ref"].get("runId", "")), "name": str(entry["ref"].get("name", ""))}
        if entry.get("label"):
            labels[s.key] = str(entry["label"])[:100]
    groups: dict[str, list[str]] = {}
    for g, dirs in (ctx.get("groups") or {}).items():
        keys = [by_dir[str(Path(d).expanduser().resolve())].key for d in dirs
                if str(Path(d).expanduser().resolve()) in by_dir]
        if str(g).strip() and keys:
            groups[str(g).strip()[:80]] = keys

    selected = set()
    for d in ctx.get("selected") or []:
        s = by_dir.get(str(Path(d).expanduser().resolve()))
        if s is not None:
            selected.add(s.key)
    history = trim_history(ctx.get("messages") or [])
    if not history or history[-1]["role"] != "user":
        raise ValueError("There is no question to answer.")
    tools = chat_tools()
    actions: list[dict] = []
    if ctx.get("page") == "samples":
        tools.append(_select_tool(store, refs, actions))
    page_links = [t for t in ctx.get("links") or [] if isinstance(t, dict) and _target_ok(t.get("id"))]
    dash_links = [t for t in ctx.get("dashboardLinks") or [] if isinstance(t, dict) and _target_ok(t.get("id"))]
    listed = [s for s in ctx.get("listed") or [] if isinstance(s, dict) and isinstance(s.get("runId"), str)
              and isinstance(s.get("name"), str)]
    if page_links or (dash_links and listed):
        tools.append(_open_tool(ctx.get("page") or "compare", page_links, dash_links if listed else [], listed,
                                actions))
    registry = {t[2]["name"]: t for t in tools}
    system = build_system(ctx, store, labels, groups, selected)
    allowed = {t["id"] for t in ctx.get("links") or [] if isinstance(t, dict) and _target_ok(t.get("id"))}
    conv = _Conversation(cfg, system, history, [t[2] for t in tools])
    used, usage = [], {"input_tokens": 0, "output_tokens": 0}
    try:
        with httpx.Client(timeout=cfg.timeout) as client:
            for turn in range(MAX_TURNS + 1):
                emit({"event": "progress", "stage": "thinking",
                      "message": "Thinking" if turn == 0 else "Reading the results"})
                text, calls, u = conv.step(client, allow_tools=turn < MAX_TURNS)
                for k in usage:
                    usage[k] += u.get(k) or 0
                if not calls:
                    final = clean_answer(text, store, allowed, refs)
                    if not final:
                        raise ProviderError("The model returned an empty answer. Try asking again.")
                    return {"answer": final, "model": cfg.model, "tools_used": used, "usage": usage,
                            "actions": actions}
                results = []
                for cid, name, args in calls:
                    title = registry[name][1] if name in registry else name
                    emit({"event": "tool", "name": name, "title": title, "message": f"Running: {title}"})
                    used.append(name)
                    results.append((cid, run_tool(registry, name, args)))
                conv.add_results(results)
                if turn == MAX_TURNS - 1:
                    conv.ask_to_finish()
    except httpx.TimeoutException:
        raise ProviderError(f"{cfg.label} did not answer within {int(cfg.timeout)} seconds.") from None
    except httpx.HTTPError as e:
        raise ProviderError(f"Could not reach {cfg.label} at {cfg.base_url}: {e.__class__.__name__}.") from None
    raise ProviderError("The model did not finish its answer.")


# ------------------------------------------------------------------------------------------------ CLI
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Answer one chat question about MARTi samples (context on stdin)")
    ap.add_argument("--provider", required=True, choices=["anthropic", "openai", "openai-compatible"])
    ap.add_argument("--model", required=True)
    ap.add_argument("--base-url")
    ap.add_argument("--timeout", type=float, default=300.0)
    args = ap.parse_args(argv)

    def emit(e):
        print(json.dumps(e), flush=True)
    try:
        ctx = json.loads(sys.stdin.read() or "{}")
        key = os.environ.get("MARTI_LLM_API_KEY") or {
            "anthropic": os.environ.get("ANTHROPIC_API_KEY"), "openai": os.environ.get("OPENAI_API_KEY")}.get(
            args.provider) or ""
        cfg = LLMConfig(args.provider, args.model, key, args.base_url or "", args.timeout)
        emit({"event": "done", **answer(ctx, cfg, emit)})
        return 0
    except (ProviderError, ValueError, KeyError, FileNotFoundError, json.JSONDecodeError) as e:
        emit({"event": "error", "message": str(e.args[0]) if e.args else str(e)})
        return 1


if __name__ == "__main__":
    sys.exit(main())

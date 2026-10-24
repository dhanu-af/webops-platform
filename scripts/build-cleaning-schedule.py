# Rebuilds lib/data/cleaning-schedule.json (the Cleaning Schedule page) from the
# controlled spreadsheet. Run when C-FORM-002 is revised:
#   python scripts/build-cleaning-schedule.py "C-FORM-002 Facility Cleaning Schedule.xlsx"
# Needs openpyxl (pip install openpyxl).
import json, os, re, sys, openpyxl

sys.stdout.reconfigure(encoding="utf-8")
SRC = sys.argv[1] if len(sys.argv) > 1 else "C-FORM-002 Facility Cleaning Schedule.xlsx"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib", "data", "cleaning-schedule.json")

wb = openpyxl.load_workbook(SRC, data_only=True)


def cell(ws, r, c):
    v = ws.cell(row=r, column=c).value
    if v is None:
        return ""
    return str(v).replace("\r\n", "\n").strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# --- document control sheet ---------------------------------------------------
dc = wb["Document Control"]
doc = {"title": cell(dc, 1, 1), "fields": []}
for r in range(3, dc.max_row + 1):
    k, v = cell(dc, r, 1), cell(dc, r, 2)
    if k and v:
        doc["fields"].append({"label": k, "value": v})

# --- zone sheets: A. schedule, B. approved agents, C. notes -------------------
zones = []
for ws in wb.worksheets[1:]:
    zone = {
        "key": slug(ws.title),
        "name": ws.title,
        "title": cell(ws, 1, 1),
        "zoneLine": cell(ws, 2, 1),
        "schedule": [],
        "agents": [],
        "notes": [],
    }
    section = None
    header_seen = False
    for r in range(3, ws.max_row + 1):
        a = cell(ws, r, 1)
        row = [cell(ws, r, c) for c in range(1, 6)]
        if not any(row):
            continue
        m = re.match(r"^([ABC])\.\s", a)
        if m and not any(row[1:]):
            section = m.group(1)
            header_seen = False
            continue
        if section == "A":
            if not header_seen:
                header_seen = True  # the "Area / Equipment | Daily | Weekly | ..." header row
                continue
            zone["schedule"].append({"area": row[0], "daily": row[1], "weekly": row[2], "monthly": row[3], "role": row[4]})
        elif section == "B":
            if not header_seen:
                header_seen = True
                continue
            zone["agents"].append({"area": row[0], "agent": row[1], "dilution": row[2], "contactTime": row[3], "notes": row[4]})
        elif section == "C":
            text = a.lstrip("•").strip()
            if text:
                zone["notes"].append(text)
    zones.append(zone)

data = {"source": "C-FORM-002 — Facility Cleaning Schedule", "document": doc, "zones": zones}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print("zones:", len(zones))
for z in zones:
    print(f"  {z['name']:28s} schedule={len(z['schedule']):2d} agents={len(z['agents']):2d} notes={len(z['notes']):2d}")

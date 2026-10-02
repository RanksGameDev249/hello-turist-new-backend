import type { Request, Response } from "express";
import { getPublicSharedTrip } from "./shared-trip.service";

function html(data: any) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  return "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Live trip safety</title><style>body{font-family:system-ui;margin:0;background:#f6f8fb;color:#17233c}.card{margin:16px;padding:18px;background:#fff;border-radius:18px;box-shadow:0 2px 12px #0001}a{display:inline-block;margin-top:12px;padding:12px 16px;border-radius:12px;background:#17233c;color:#fff;text-decoration:none}</style></head><body><div class=\"card\"><h2>Hello Kurukshetra • Live trip</h2><div id=\"app\">Loading…</div></div><script>const initial="+payload+",shareId="+JSON.stringify(data.shareId)+";function render(d){const r=d.ride,l=r.liveLocation,v=r.driver;document.getElementById('app').innerHTML='<b>Status:</b> '+r.status+'<br><br><b>Driver:</b> '+(v?.name||'Not assigned')+'<br><b>Driver phone:</b> '+(v?.phone||'Not available')+'<br><b>Vehicle:</b> '+(v?.vehicle?[v.vehicle.make,v.vehicle.model,v.vehicle.color,v.vehicle.registrationNumber].filter(Boolean).join(' '):'Not assigned')+'<br><br><b>Route:</b> '+r.pickupAddress+' → '+r.dropoffAddress+'<br><br>'+(l?'<b>Live driver location:</b> '+l.latitude+', '+l.longitude+'<br><a target=\"_blank\" href=\"https://www.google.com/maps/search/?api=1&query='+l.latitude+','+l.longitude+'\">Open live location in Maps</a>':'Live driver location is not available yet');}render(initial);setInterval(async()=>{try{const x=await fetch('/api/v1/shared-trips/'+shareId);if(x.ok)render((await x.json()).data)}catch(e){}},5000);</script></body></html>";
}

export async function publicSharedTripController(req: Request, res: Response) {\n  res.setHeader("Cache-Control", "no-store, private");\n  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  try {
    const data = await getPublicSharedTrip(String(req.params.shareId));
    if (String(req.headers.accept ?? "").includes("text/html")) return res.type("html").send(html(data));
    return res.json({ success: true, data, error: null, requestId: req.requestId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "SHARED_TRIP_FAILED";
    const status = code === "SHARED_TRIP_NOT_FOUND" || code === "RIDE_NOT_FOUND" ? 404 : code === "SHARED_TRIP_EXPIRED" ? 410 : 400;
    return res.status(status).json({ success: false, data: null, error: { code, message: "Shared trip is unavailable" }, requestId: req.requestId });
  }
}
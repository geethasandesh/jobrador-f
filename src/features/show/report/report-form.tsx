"use client";

import { Caveat } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, createLead, searchPlaces } from "@/lib/api/client";
import { CATEGORY_OPTIONS, LEAD_JOB_TYPE_OPTIONS } from "@/lib/labels";
import { BERLIN_ONLY_MESSAGE, BERLIN_PLACES, DEFAULT_PLACE } from "@/lib/places";

const handwriting = Caveat({ weight: "600", subsets: ["latin"] });

export function ReportForm({
  embedded = false,
  areaLabel,
  latitude,
  longitude,
  purpose = "tip",
  onCreated,
}: {
  embedded?: boolean;
  areaLabel?: string;
  latitude?: number;
  longitude?: number;
  purpose?: "tip" | "business";
  onCreated?: (lead: { id: string; latitude: number; longitude: number; area: string }) => void;
}) {
  const router = useRouter();
  const matchedPlace = BERLIN_PLACES.find((item) => item.label === areaLabel);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState(purpose === "business" ? "MINIJOB" : "NOT_SURE");
  const [category, setCategory] = useState("restaurant");
  const [placeId, setPlaceId] = useState(matchedPlace?.id ?? DEFAULT_PLACE.id);
  const [address, setAddress] = useState("");
  const [salary, setSalary] = useState("");
  const [hoursMin, setHoursMin] = useState("");
  const [hoursMax, setHoursMax] = useState("");
  const [point, setPoint] = useState<{ latitude: number; longitude: number; area: string } | null>(
    embedded && latitude != null && longitude != null
      ? { latitude, longitude, area: areaLabel || "This spot" }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);

  const place = BERLIN_PLACES.find((item) => item.id === placeId) ?? DEFAULT_PLACE;
  const location = point ?? { latitude: place.latitude, longitude: place.longitude, area: place.label };
  const business = purpose === "business";
  const chosenArea = location.area.split(",")[0] ?? location.area;
  const placeUnpicked = placeQuery.trim().length > 0 && placeQuery.trim().toLowerCase() !== chosenArea.toLowerCase();

  useEffect(() => {
    const query = placeQuery.trim();
    if (query.length < 2 || query.toLowerCase() === chosenArea.toLowerCase()) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          if (result.outsideBerlin) {
            setPlaceHits([]);
            setError(BERLIN_ONLY_MESSAGE);
            return;
          }
          setError(null);
          setPlaceHits(result.places);
        })
        .catch(() => {
          if (!controller.signal.aborted) setPlaceHits([]);
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [placeQuery, chosenArea]);

  function choosePlace(place: { label: string; latitude: number; longitude: number }) {
    setPoint({ latitude: place.latitude, longitude: place.longitude, area: place.label });
    setPlaceQuery(place.label.split(",")[0] ?? place.label);
    setPlaceHits([]);
    setError(null);
  }

  function useMyLocation() {
    if (!navigator.geolocation || !window.isSecureContext) {
      setError("This page cannot read your location. Type the Berlin area instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        const inside = nextLatitude >= 52.33 && nextLatitude <= 52.68 && nextLongitude >= 13.05 && nextLongitude <= 13.77;
        if (!inside) {
          setError(BERLIN_ONLY_MESSAGE);
          return;
        }
        setPoint({ latitude: nextLatitude, longitude: nextLongitude, area: "Your location" });
        setPlaceQuery("");
        setPlaceHits([]);
        setError(null);
      },
      () => setError("Location was blocked. Type the Berlin area instead."),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!business && placeUnpicked) {
      setError("Pick a Berlin place from the list, or clear the field to keep the map spot.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const created = await createLead({
        businessName,
        description,
        jobType,
        category,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address || undefined,
        area: location.area,
        salaryMin: salary ? Number(salary) : undefined,
        hoursMin: hoursMin ? Number(hoursMin) : undefined,
        hoursMax: hoursMax ? Number(hoursMax) : undefined,
        poster: business ? "business" : "student",
      });
      if (onCreated) {
        onCreated({
          id: created.lead.id,
          latitude: created.lead.latitude,
          longitude: created.lead.longitude,
          area: created.lead.area,
        });
        setPending(false);
        return;
      }
      router.push(`/leads/${created.lead.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : business ? "Could not post that job." : "Could not share that tip.");
      setPending(false);
    }
  }

  const areaField = (
    <label className="block text-sm font-medium">
      {business ? "Area" : "Where in Berlin"}
      <select
        className="field mt-1"
        value={placeId}
        onChange={(event) => {
          setPlaceId(event.target.value);
          setPoint(null);
        }}
      >
        {BERLIN_PLACES.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </label>
  );

  const locationButton = (
    <button type="button" onClick={useMyLocation} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium">
      {business ? "Use the shop location" : "Use where I am"}
    </button>
  );

  const typeChips = (
    <div className="flex flex-wrap gap-2">
      {LEAD_JOB_TYPE_OPTIONS.map((option) => {
        const on = jobType === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setJobType(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const payFields = (
    <div className="grid gap-3">
      <label className="block text-sm font-medium">
        € / hour
        <input className="field mt-1" inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="Leave blank if unknown" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Hours from
          <input className="field mt-1" inputMode="numeric" value={hoursMin} onChange={(event) => setHoursMin(event.target.value)} placeholder="—" />
        </label>
        <label className="block text-sm font-medium">
          Hours to
          <input className="field mt-1" inputMode="numeric" value={hoursMax} onChange={(event) => setHoursMax(event.target.value)} placeholder="—" />
        </label>
      </div>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className={embedded ? "" : "mx-auto max-w-xl px-4 py-8"}>
      {business ? (
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="border-b border-dashed border-line px-4 py-3">
            <p className="text-[11px] font-bold tracking-[0.18em]">NOW HIRING</p>
            <p className="mt-1 text-sm text-muted">A job from your business. You can stop hiring or delete it later.</p>
          </div>
          <div className="space-y-4 p-4">
            <label className="block">
              <span className="text-sm font-medium">Business name</span>
              <input
                className="mt-1 w-full border-0 border-b border-line bg-transparent px-0 py-2 text-2xl font-semibold outline-none placeholder:text-zinc-300"
                required
                minLength={2}
                maxLength={80}
                placeholder="Café name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Role you are hiring for
              <textarea
                className="field mt-1 min-h-24"
                required
                minLength={10}
                maxLength={500}
                placeholder="Weekend barista, German not required"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Contract</legend>
              {typeChips}
            </fieldset>
            <label className="block text-sm font-medium">
              Kind of place
              <select className="field mt-1" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {areaField}
            {locationButton}
            {point ? <p className="text-sm text-brand">Using your current location.</p> : null}
            <label className="block text-sm font-medium">
              Street address
              <input className="field mt-1" maxLength={160} placeholder="Optional" value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
            <div className="rounded-2xl bg-zinc-50 p-3">
              <p className="text-sm font-medium">Pay and hours</p>
              <p className="mb-3 mt-1 text-sm text-muted">Leave these empty if you are not publishing them.</p>
              {payFields}
            </div>
            {error ? <p className="text-sm text-place">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Posting…" : "Post this job"}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl bg-[#ffe56a] px-4 pt-5 pb-4">
          <span className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-8deg] bg-white/70" aria-hidden />
          <p className={`${handwriting.className} text-2xl leading-none text-ink`}>I saw a place hiring</p>
          <p className="mt-1 text-xs text-ink/70">Not a confirmed job.</p>
          <div className="mt-3 space-y-3">
            <input
              className={`${handwriting.className} w-full border-0 border-b border-ink/20 bg-transparent px-0 py-1 text-2xl text-ink outline-none placeholder:text-ink/35`}
              required
              minLength={2}
              maxLength={80}
              aria-label="Place"
              placeholder="The café on the corner"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
            <textarea
              className="min-h-16 w-full resize-none bg-white/50 px-3 py-2 text-sm outline-none placeholder:text-ink/40"
              required
              minLength={10}
              maxLength={500}
              aria-label="What I noticed"
              placeholder="A sign in the window said they need weekend help"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            {embedded ? (
              <div>
                <input
                  value={placeQuery}
                  onChange={(event) => {
                    setPlaceQuery(event.target.value);
                    setPlaceHits([]);
                  }}
                  aria-label="Where in Berlin"
                  placeholder="Type a Berlin area"
                  className="w-full bg-white/50 px-3 py-2 text-sm outline-none placeholder:text-ink/40"
                />
                {placeHits.length === 0 ? <p className="mt-1 text-xs text-ink/70">Using {chosenArea}, unless you pick another place.</p> : null}
                {placeHits.length > 0 ? (
                  <ul className="mt-1 overflow-hidden rounded-xl bg-white">
                    {placeHits.map((place) => (
                      <li key={`${place.label}-${place.latitude}`}>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choosePlace(place)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                        >
                          {place.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button type="button" onClick={useMyLocation} className="mt-1 text-sm font-semibold">
                  Use my location
                </button>
              </div>
            ) : (
              <>
                {areaField}
                {locationButton}
              </>
            )}
            <select className="field" aria-label="Kind of place" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">Add details</summary>
              <div className="mt-3 space-y-3">
                <select className="field" aria-label="Job type" value={jobType} onChange={(event) => setJobType(event.target.value)}>
                  {LEAD_JOB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input className="field" aria-label="Address" maxLength={160} placeholder="Address, if you know it" value={address} onChange={(event) => setAddress(event.target.value)} />
                {payFields}
              </div>
            </details>
            {error ? <p className="text-sm text-place">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Sharing…" : "Share this tip"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

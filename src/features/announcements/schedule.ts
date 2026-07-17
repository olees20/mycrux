function partsAt(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part)=>part.type===type)?.value);
  return { year:get("year"),month:get("month"),day:get("day"),hour:get("hour"),minute:get("minute") };
}

export function zonedDateTimeToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time");
  const desired = { year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5]) };
  const desiredUtc = Date.UTC(desired.year,desired.month-1,desired.day,desired.hour,desired.minute);
  let instant = desiredUtc;
  for (let attempt=0;attempt<3;attempt+=1) { const observed=partsAt(new Date(instant),timezone); instant-=Date.UTC(observed.year,observed.month-1,observed.day,observed.hour,observed.minute)-desiredUtc; }
  const result = new Date(instant);
  if (isoToZonedInput(result.toISOString(),timezone)!==value) throw new Error("That local time does not exist in the gym timezone");
  return result.toISOString();
}

export function isoToZonedInput(value: string, timezone: string) {
  const part=partsAt(new Date(value),timezone); const pad=(number:number)=>String(number).padStart(2,"0");
  return `${part.year}-${pad(part.month)}-${pad(part.day)}T${pad(part.hour)}:${pad(part.minute)}`;
}

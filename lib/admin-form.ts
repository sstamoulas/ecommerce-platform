export function getFormValue(formData: FormData, name: string, fallback = "") {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}

export function getFormOptionalValue(formData: FormData, name: string) {
  const value = getFormValue(formData, name).trim();
  return value.length ? value : undefined;
}

export function getFormBoolean(formData: FormData, name: string) {
  const value = getFormValue(formData, name).trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

export function getFormNumber(formData: FormData, name: string, fallback = 0) {
  const value = Number(getFormValue(formData, name).trim());
  return Number.isFinite(value) ? value : fallback;
}

export function getFormOptionalNumber(formData: FormData, name: string) {
  const value = getFormOptionalValue(formData, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getFormCsv(formData: FormData, name: string) {
  const value = getFormValue(formData, name);
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

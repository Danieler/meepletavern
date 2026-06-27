function readLegalValue(name: string) {
  return process.env[name]?.trim() || "";
}

export function getLegalIdentity() {
  const identity = {
    ownerName: readLegalValue("LEGAL_OWNER_NAME"),
    contactEmail: readLegalValue("LEGAL_CONTACT_EMAIL"),
    registryDetails: readLegalValue("LEGAL_REGISTRY_DETAILS")
  };

  const requiredFields = [
    ["Titular", identity.ownerName],
    ["Email de contacto", identity.contactEmail]
  ] as const;

  return {
    ...identity,
    missingFields: requiredFields.filter(([, value]) => !value).map(([label]) => label),
    isComplete: requiredFields.every(([, value]) => Boolean(value))
  };
}

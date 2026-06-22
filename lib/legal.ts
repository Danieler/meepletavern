function readLegalValue(name: string) {
  return process.env[name]?.trim() || "";
}

export function getLegalIdentity() {
  const identity = {
    ownerName: readLegalValue("LEGAL_OWNER_NAME"),
    taxId: readLegalValue("LEGAL_TAX_ID"),
    postalAddress: readLegalValue("LEGAL_POSTAL_ADDRESS"),
    contactEmail: readLegalValue("LEGAL_CONTACT_EMAIL"),
    registryDetails: readLegalValue("LEGAL_REGISTRY_DETAILS")
  };

  const requiredFields = [
    ["Titular", identity.ownerName],
    ["NIF/CIF", identity.taxId],
    ["Domicilio", identity.postalAddress],
    ["Email de contacto", identity.contactEmail]
  ] as const;

  return {
    ...identity,
    missingFields: requiredFields.filter(([, value]) => !value).map(([label]) => label),
    isComplete: requiredFields.every(([, value]) => Boolean(value))
  };
}

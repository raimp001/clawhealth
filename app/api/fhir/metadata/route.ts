/**
 * FHIR R4 Capability Statement — GET /api/fhir/metadata
 * Required by the FHIR specification for server discovery.
 * Declares Da Vinci PAS support for the 2027 mandate.
 */

import { NextResponse } from "next/server"
import type { CapabilityStatement } from "@/lib/fhir/types"

const FHIR_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://openrx.health"

export async function GET() {
  const statement: CapabilityStatement = {
    resourceType: "CapabilityStatement",
    id: "openrx-capability",
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-pas-capability"],
    },
    url: `${FHIR_BASE}/api/fhir/metadata`,
    version: "1.0.0",
    name: "OpenRxFHIRCapabilityStatement",
    title: "OpenRx FHIR R4 Capability Statement",
    status: "active",
    experimental: false,
    date: new Date().toISOString(),
    publisher: "OpenRx Health",
    description:
      "OpenRx implements the HL7 Da Vinci Prior Authorization Support (PAS) IG v2.0, " +
      "US Core v6.1, and HRex v1.0 profiles. Compliant with the CMS Interoperability " +
      "and Prior Authorization Final Rule (CMS-0057-F) effective 2027.",
    purpose:
      "Enable real-time, standards-based prior authorization exchange between providers " +
      "and payers using FHIR R4 and the Da Vinci PAS Implementation Guide.",
    kind: "instance",
    fhirVersion: "4.0.1",
    format: ["application/fhir+json", "application/json"],
    rest: [
      {
        mode: "server",
        documentation:
          "OpenRx supports the Da Vinci PAS workflow via Claim/$submit operation. " +
          "All resources conform to US Core R4 profiles.",
        security: {
          cors: true,
          service: [{
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/restful-security-service",
              code: "SMART-on-FHIR",
              display: "SMART on FHIR",
            }],
          }],
          description: "OpenID Connect + SMART on FHIR authorization required in production. " +
            "HIPAA Business Associate Agreement required for PHI access.",
        },
        resource: [
          {
            type: "Patient",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "identifier", type: "token" },
              { name: "name", type: "string" },
              { name: "birthdate", type: "date" },
            ],
          },
          {
            type: "Practitioner",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-practitioner",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "identifier", type: "token", documentation: "NPI search supported" },
              { name: "name", type: "string" },
            ],
          },
          {
            type: "Coverage",
            profile: "http://hl7.org/fhir/us/davinci-hrex/StructureDefinition/hrex-coverage",
            interaction: [
              { code: "read" },
              { code: "create" },
            ],
          },
          {
            type: "Claim",
            profile: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claim",
            documentation: "Da Vinci PAS Claim profile for prior authorization requests",
            interaction: [
              { code: "create" },
              { code: "read" },
            ],
          },
          {
            type: "ClaimResponse",
            profile: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claimresponse",
            documentation: "Da Vinci PAS ClaimResponse for authorization decisions",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
          },
          {
            type: "ServiceRequest",
            profile: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-servicerequest",
            interaction: [
              { code: "read" },
              { code: "create" },
            ],
          },
        ],
        operation: [
          {
            name: "submit",
            definition: "http://hl7.org/fhir/us/davinci-pas/OperationDefinition/Claim-submit",
            documentation:
              "Submit a prior authorization request as a FHIR Bundle. " +
              "Returns a ClaimResponse with the payer decision or pending status. " +
              "Implements Da Vinci PAS v2.0 Claim/$submit operation.",
          },
          {
            name: "inquire",
            definition: "http://hl7.org/fhir/us/davinci-pas/OperationDefinition/Claim-inquire",
            documentation: "Query status of a previously submitted prior authorization request.",
          },
        ],
      },
    ],
  }

  return NextResponse.json(statement, {
    headers: {
      "Content-Type": "application/fhir+json",
      "X-OpenRx-FHIR-Version": "R4",
      "X-Da-Vinci-PAS": "v2.0",
    },
  })
}

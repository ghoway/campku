import type { Context } from "hono";
import { PropertyService } from "./property.service";
import { ok, created, okList } from "@/shared/utils/response";

const propertyService = new PropertyService();

export async function listProperties(c: Context) {
  const query = c.req.query();
  const result = await propertyService.listPublic(query);
  return okList(c, result.data, result.meta);
}

export async function getProperty(c: Context) {
  const id = c.req.param("propertyId") ?? "";
  const data = await propertyService.getPublic(id);
  return ok(c, data);
}

export async function createProperty(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await propertyService.create(body, user.id);
  return created(c, data);
}

export async function updateProperty(c: Context) {
  const id = c.req.param("propertyId") ?? "";
  const body = c.get("validated");
  const data = await propertyService.update(id, body);
  return ok(c, data);
}

export async function deactivateProperty(c: Context) {
  const id = c.req.param("propertyId") ?? "";
  const data = await propertyService.deactivate(id);
  return ok(c, data);
}

export async function setPropertyFacilities(c: Context) {
  const id = c.req.param("propertyId") ?? "";
  const body = c.get("validated");
  const data = await propertyService.setFacilities(id, body.facilityIds);
  return ok(c, data);
}
// One config per collection. The URL under /browse mirrors the API path,
// e.g. /browse/manufacturers/1/models  ->  GET /api/manufacturers/1/models
export const RESOURCES = {
  manufacturers: {
    title: "Manufacturers", singular: "manufacturer", id: "id_Manufacturer", label: "name", child: "models",
    writeRoles: ["admin"],
    fields: [{ name: "name", label: "Name", required: true }],
  },
  models: {
    title: "Models", singular: "model", id: "id_Model", label: "model_name", child: "generations",
    writeRoles: ["admin"],
    fields: [{ name: "model_name", label: "Model name", required: true }],
  },
  generations: {
    title: "Generations", singular: "generation", id: "id_Generation", label: "generation_name", child: "cars",
    writeRoles: ["admin"],
    columns: ["code", "year_from", "year_to"],
    fields: [
      { name: "generation_name", label: "Name", required: true },
      { name: "code", label: "Code", required: true },
      { name: "year_from", label: "Year from", type: "number", required: true },
      { name: "year_to", label: "Year to", type: "number" },
    ],
  },
  cars: {
    title: "Cars", singular: "car", id: "id_Car", label: "modification_name", child: "parts",
    writeRoles: ["admin"],
    columns: ["car_year", "fuel", "transmission", "power_kw", "displacement_cc"],
    fields: [
      { name: "modification_name", label: "Modification", required: true },
      { name: "car_year", label: "Year", type: "number", required: true },
      { name: "fuel", label: "Fuel", type: "select", options: ["Petrol", "Diesel"], required: true },
      { name: "transmission", label: "Transmission", type: "select", options: ["manual", "automatic"], required: true },
      { name: "power_kw", label: "Power (kW)", type: "number", required: true },
      { name: "displacement_cc", label: "Displacement (cc)", type: "number", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  parts: {
    title: "Parts", singular: "part", id: "id_Part", label: "name", child: null,
    writeRoles: ["seller", "admin"],
    ownerField: "id_User", // needs `id_User: p.fk_User` in serializePart
    columns: ["OE_code", "price", "part_status"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "OE_code", label: "OE code", required: true },
      { name: "price", label: "Price (EUR)", type: "number", step: "0.01", required: true },
      { name: "part_status", label: "Status", type: "select", options: ["available", "sold"] },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
};

export const NAMES = Object.keys(RESOURCES);

export const COLS = {
  OE_code: "OE code", part_status: "Status", price: "Price", year_from: "From", year_to: "To",
  car_year: "Year", power_kw: "Power (kW)", displacement_cc: "Engine (cc)", code: "Code",
  fuel: "Fuel", transmission: "Gearbox",
};

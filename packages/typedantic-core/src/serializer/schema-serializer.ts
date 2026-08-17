import type { CoreSchema, DumpOptions } from '../schema/types.js';

export class SchemaSerializer {
  constructor(private readonly schema: CoreSchema) {}

  toPython(instance: unknown, options: DumpOptions = {}): unknown {
    return serializeValue(instance, this.schema, options);
  }

  toJson(instance: unknown, options: DumpOptions = {}): string {
    const data = this.toPython(instance, { ...options, mode: 'json' });
    return JSON.stringify(data);
  }
}

function serializeValue(value: unknown, schema: CoreSchema, options: DumpOptions): unknown {
  if (value === undefined) {
    if (options.excludeUnset) return undefined;
    return value;
  }

  if (value === null) {
    if (options.excludeNone) return undefined;
    return null;
  }

  switch (schema.type) {
    case 'nullable': {
      if (value === null) return options.excludeNone ? undefined : null;
      return serializeValue(value, schema.schema, options);
    }
    case 'optional':
      return value === undefined ? undefined : serializeValue(value, schema.schema, options);
    case 'default':
    case 'default-factory':
      return serializeValue(value, schema.schema, options);
    case 'list': {
      if (!Array.isArray(value)) return value;
      return value.map((item) => serializeValue(item, schema.itemsSchema, options));
    }
    case 'dict': {
      if (typeof value !== 'object' || value === null) return value;
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const serialized = serializeValue(v, schema.valuesSchema, options);
        if (serialized !== undefined) result[k] = serialized;
      }
      return result;
    }
    case 'model-fields': {
      if (typeof value !== 'object' || value === null) return value;
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const [name, field] of Object.entries(schema.fields)) {
        if (options.exclude?.has(name)) continue;
        if (options.include && !options.include.has(name)) continue;

        const key = options.byAlias && field.alias ? field.alias : name;
        if (!(name in obj)) {
          if (options.excludeUnset) continue;
          continue;
        }

        let fieldValue = obj[name];
        if (fieldValue === undefined && options.excludeUnset) continue;
        if (fieldValue === null && options.excludeNone) continue;
        if (fieldValue === field.default && options.excludeDefaults) continue;

        const serialized = serializeValue(fieldValue, field.schema, options);
        if (serialized !== undefined) result[key] = serialized;
      }

      if (schema.extra === 'allow') {
        for (const [k, v] of Object.entries(obj)) {
          if (!(k in result) && !Object.keys(schema.fields).includes(k)) {
            result[k] = v;
          }
        }
      }

      return result;
    }
    case 'date':
      if (value instanceof Date) {
        return options.mode === 'json' ? value.toISOString() : value;
      }
      return value;
    case 'union':
      return value;
    default:
      return value;
  }
}

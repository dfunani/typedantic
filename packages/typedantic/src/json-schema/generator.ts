import type { CoreSchema } from '@typedantic/core';
import { SchemaSerializer, SchemaValidator } from '@typedantic/core';

const defs = new Map<string, Record<string, unknown>>();

export function generateJsonSchema(schema: CoreSchema, title?: string): Record<string, unknown> {
  defs.clear();
  const properties = schemaToJsonSchema(schema, title);
  const result: Record<string, unknown> = { ...properties };

  if (defs.size > 0) {
    result.$defs = Object.fromEntries(defs);
  }

  return result;
}

function schemaToJsonSchema(schema: CoreSchema, title?: string): Record<string, unknown> {
  switch (schema.type) {
    case 'str':
      return stripUndefined({
        type: 'string',
        minLength: schema.minLength,
        maxLength: schema.maxLength,
        pattern: schema.pattern ? String(schema.pattern) : undefined,
        title,
      });
    case 'int':
      return stripUndefined({
        type: 'integer',
        minimum: schema.ge ?? (schema.gt !== undefined ? schema.gt + (Number.isInteger(schema.gt) ? 1 : 0.000001) : undefined),
        maximum: schema.le ?? (schema.lt !== undefined ? schema.lt - (Number.isInteger(schema.lt) ? 1 : 0.000001) : undefined),
        title,
      });
    case 'float':
      return stripUndefined({
        type: 'number',
        minimum: schema.ge,
        maximum: schema.le,
        title,
      });
    case 'bool':
      return { type: 'boolean', title };
    case 'literal':
      return { const: schema.expected[0], title };
    case 'enum':
      return { type: 'string', enum: [...schema.members], title };
    case 'list':
      return {
        type: 'array',
        items: schemaToJsonSchema(schema.itemsSchema),
        minItems: schema.minLength,
        maxItems: schema.maxLength,
        title,
      };
    case 'dict':
      return {
        type: 'object',
        additionalProperties: schemaToJsonSchema(schema.valuesSchema),
        title,
      };
    case 'nullable': {
      const inner = schemaToJsonSchema(schema.schema);
      return { anyOf: [inner, { type: 'null' }], title };
    }
    case 'optional':
      return schemaToJsonSchema(schema.schema, title);
    case 'default':
    case 'default-factory':
      return schemaToJsonSchema(schema.schema, title);
    case 'date':
      return { type: 'string', format: 'date-time', title };
    case 'union':
      return {
        oneOf: schema.choices.map((c) => schemaToJsonSchema(c)),
        ...(schema.discriminator
          ? {
              discriminator: {
                propertyName: schema.discriminator,
                mapping: buildDiscriminatorMapping(schema),
              },
            }
          : {}),
        title,
      };
    case 'model-fields': {
      const modelTitle = title ?? schema.modelName ?? 'Model';
      const refName = modelTitle;

      if (!defs.has(refName)) {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [name, field] of Object.entries(schema.fields)) {
          properties[name] = schemaToJsonSchema(field.schema, name);
          if (field.required) required.push(name);
        }

        defs.set(refName, stripUndefined({
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
          additionalProperties: schema.extra === 'allow' ? true : schema.extra === 'forbid' ? false : undefined,
          title: modelTitle,
        }));
      }

      return { $ref: `#/$defs/${refName}` };
    }
    case 'any':
      return {};
    default:
      return schema.type.startsWith('function') && 'schema' in schema
        ? schemaToJsonSchema((schema as { schema: CoreSchema }).schema, title)
        : {};
  }
}

function buildDiscriminatorMapping(schema: Extract<CoreSchema, { type: 'union' }>): Record<string, string> {
  const mapping: Record<string, string> = {};
  if (!schema.discriminator) return mapping;
  for (const choice of schema.choices) {
    if (choice.type === 'model-fields') {
      const model = choice as Extract<CoreSchema, { type: 'model-fields' }>;
      const discField = model.fields[schema.discriminator];
      const title = model.modelName ?? 'Model';
      if (discField?.schema.type === 'literal') {
        const val = (discField.schema as Extract<CoreSchema, { type: 'literal' }>).expected[0];
        mapping[String(val)] = `#/$defs/${title}`;
      } else if (discField?.schema.type === 'default') {
        const val = (discField.schema as Extract<CoreSchema, { type: 'default' }>).defaultValue;
        mapping[String(val)] = `#/$defs/${title}`;
      }
    }
  }
  return mapping;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export class TypeAdapter<T = unknown> {
  private readonly validator: SchemaValidator;
  private readonly serializer: SchemaSerializer;

  constructor(private readonly schema: CoreSchema) {
    this.validator = new SchemaValidator(schema);
    this.serializer = new SchemaSerializer(schema);
  }

  validatePython(input: unknown): T {
    return this.validator.validatePython(input) as T;
  }

  validateJson(json: string): T {
    return this.validator.validateJson(json) as T;
  }

  dumpPython(instance: T, options?: import('@typedantic/core').DumpOptions): unknown {
    return this.serializer.toPython(instance, options);
  }

  dumpJson(instance: T, options?: import('@typedantic/core').DumpOptions): string {
    return this.serializer.toJson(instance, options);
  }

  jsonSchema(): Record<string, unknown> {
    return generateJsonSchema(this.schema);
  }
}

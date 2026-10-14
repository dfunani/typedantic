import type { BaseSchema } from '../schema/types.js';

export type JsonSchema = Record<string, unknown>;

export interface JsonSchemaOptions {
    title?: string;
    description?: string;
    defs?: Record<string, JsonSchema>;
}

export function toJsonSchema(schema: BaseSchema, options: JsonSchemaOptions = {}): JsonSchema {
    const defs: Record<string, JsonSchema> = options.defs ?? {};
    const result = schemaToJson(schema, defs);
    if (options.title) result.title = options.title;
    if (options.description) result.description = options.description;
    if (Object.keys(defs).length > 0) {
        return { ...result, $defs: defs };
    }
    return result;
}

function schemaToJson(schema: BaseSchema, defs: Record<string, JsonSchema>): JsonSchema {
    switch (schema.type) {
        case 'int':
            return {
                type: 'integer',
                ...(schema.ge !== undefined ? { minimum: schema.ge } : {}),
                ...(schema.gt !== undefined ? { exclusiveMinimum: schema.gt } : {}),
                ...(schema.le !== undefined ? { maximum: schema.le } : {}),
                ...(schema.lt !== undefined ? { exclusiveMaximum: schema.lt } : {}),
                ...(schema.multipleOf !== undefined ? { multipleOf: schema.multipleOf } : {}),
            };
        case 'number':
            return {
                type: 'number',
                ...(schema.ge !== undefined ? { minimum: schema.ge } : {}),
                ...(schema.gt !== undefined ? { exclusiveMinimum: schema.gt } : {}),
                ...(schema.le !== undefined ? { maximum: schema.le } : {}),
                ...(schema.lt !== undefined ? { exclusiveMaximum: schema.lt } : {}),
                ...(schema.multipleOf !== undefined ? { multipleOf: schema.multipleOf } : {}),
            };
        case 'string':
            return {
                type: 'string',
                ...(schema.minLength !== undefined ? { minLength: schema.minLength } : {}),
                ...(schema.maxLength !== undefined ? { maxLength: schema.maxLength } : {}),
                ...(schema.pattern
                    ? {
                          pattern:
                              typeof schema.pattern === 'string'
                                  ? schema.pattern
                                  : schema.pattern.source,
                      }
                    : {}),
            };
        case 'boolean':
            return { type: 'boolean' };
        case 'date':
            return { type: 'string', format: 'date-time' };
        case 'literal':
            return schema.expected.length === 1
                ? { const: schema.expected[0] }
                : { enum: [...schema.expected] };
        case 'enum':
            return { type: 'string', enum: [...schema.members] };
        case 'any':
            return {};
        case 'never':
            return { not: {} };
        case 'nullable':
            return { anyOf: [schemaToJson(schema.schema, defs), { type: 'null' }] };
        case 'optional':
            return schemaToJson(schema.schema, defs);
        case 'default':
        case 'default-factory':
        case 'function-before':
        case 'function-after':
        case 'function-wrap':
            return schemaToJson(schema.schema, defs);
        case 'function-plain':
            return {};
        case 'array':
            return {
                type: 'array',
                items: schemaToJson(schema.itemsSchema, defs),
                ...(schema.minLength !== undefined ? { minItems: schema.minLength } : {}),
                ...(schema.maxLength !== undefined ? { maxItems: schema.maxLength } : {}),
            };
        case 'object':
            return {
                type: 'object',
                additionalProperties: schemaToJson(schema.valuesSchema, defs),
            };
        case 'union': {
            const oneOf = schema.choices.map((c) => schemaToJson(c, defs));
            const result: JsonSchema = { oneOf };
            if (schema.discriminator) {
                result.discriminator = { propertyName: schema.discriminator };
            }
            return result;
        }
        case 'model-fields': {
            const name = schema.modelName || 'Model';
            if (defs[name]) {
                return { $ref: `#/$defs/${name}` };
            }
            // Placeholder to break recursion
            defs[name] = {};
            const properties: Record<string, JsonSchema> = {};
            const required: string[] = [];
            for (const [fname, field] of Object.entries(schema.fields)) {
                if (field.exclude) continue;
                properties[fname] = schemaToJson(field.schema, defs);
                if (field.title) (properties[fname] as JsonSchema).title = field.title;
                if (field.description)
                    (properties[fname] as JsonSchema).description = field.description;
                if (field.required && field.default === undefined && !field.defaultFactory) {
                    required.push(fname);
                }
            }
            const modelSchema: JsonSchema = {
                type: 'object',
                properties,
                ...(required.length ? { required } : {}),
                additionalProperties: schema.extra === 'forbid' ? false : true,
            };
            if (schema.modelName) modelSchema.title = schema.modelName;
            defs[name] = modelSchema;
            return { $ref: `#/$defs/${name}` };
        }
        default:
            return {};
    }
}

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, DiscriminatedUnion, TypeAdapter, inferSchemaFromType, generateJsonSchema } from './index.js';

class Cat extends BaseModel {
  @Field({ default: 'cat' })
  petType!: string;

  @Field({ type: Boolean })
  meows!: boolean;
}

class Dog extends BaseModel {
  @Field({ default: 'dog' })
  petType!: string;

  @Field({ type: Boolean })
  barks!: boolean;
}

const PetSchema = DiscriminatedUnion('petType', Cat, Dog);

describe('DiscriminatedUnion', () => {
  it('validates cat by discriminator', () => {
    const adapter = new TypeAdapter(inferSchemaFromType(PetSchema));
    const result = adapter.validatePython({ petType: 'cat', meows: true });
    expect(result).toMatchObject({ petType: 'cat', meows: true });
  });

  it('validates dog by discriminator', () => {
    const adapter = new TypeAdapter(inferSchemaFromType(PetSchema));
    const result = adapter.validatePython({ petType: 'dog', barks: false });
    expect(result).toMatchObject({ petType: 'dog', barks: false });
  });

  it('generates JSON schema with discriminator', () => {
    const schema = generateJsonSchema(inferSchemaFromType(PetSchema));
    expect(schema.oneOf ?? schema.discriminator).toBeDefined();
  });
});

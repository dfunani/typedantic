import { BaseModel } from './base-model.js';
import { TypeAdapter } from '../json-schema/generator.js';
import { inferSchemaFromType } from '../internal/schema-builder.js';

export class RootModel<T = unknown> extends BaseModel {
  root!: T;

  getRoot(): T {
    return this.root;
  }

  override modelDump(): Record<string, unknown> {
    return this.root as Record<string, unknown>;
  }
}

export function RootModelOf<T>(type: unknown): typeof RootModel<T> {
  class TypedRootModel extends RootModel<T> {
    declare root: T;

    static rootValidate(data: unknown): InstanceType<typeof TypedRootModel> {
      const schema = inferSchemaFromType(type);
      const adapter = new TypeAdapter(schema);
      const validated = adapter.validatePython(data);
      return TypedRootModel.modelConstruct({ root: validated }) as InstanceType<typeof TypedRootModel>;
    }
  }
  return TypedRootModel;
}

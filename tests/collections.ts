import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class TagList extends BaseModel {
    @Field({ type: Array, items: String, minLength: 1, maxLength: 3 })
    tags!: string[];

    @Field({ type: 'dict', values: Number, keys: String })
    scores!: Record<string, number>;
}

const ok = TagList.modelValidate({ tags: ['a', 'b'], scores: { qa: 10 } });
console.log('collections ok', ok.modelDump());

try {
    TagList.modelValidate({ tags: [], scores: { x: 1 } });
    console.log('expected error: validation passed');
} catch (e) {
    console.log('expected error', e instanceof Error ? e.message : e);
}

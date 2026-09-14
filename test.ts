import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from './packages/typedantic/src/index.js';

@modelConfig({ extra: 'forbid' })
class Test extends BaseModel {
    @Field({ type: Number, ge: 0 })
    flag!: number;

    @Field({ type: String, minLength: 1 })
    name!: string;

    @Field({ type: Boolean })
    active!: boolean;
}

const ok = Test.modelValidate({ flag: 10, name: 'Ada', active: true });
console.log(ok.modelDump());

try {
    Test.modelValidate({ flag: 'nope', name: 'Ada', active: true });
} catch (e) {
    console.log('expected error', e);
}
import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';
@modelConfig({ extra: 'ignore' })
class Test extends BaseModel {
    @Field({ type: Number, ge: 0, strict: false })
    flag!: number;

    @Field({ type: String, minLength: 1 })
    name!: string;

    @Field({ type: Boolean })
    active!: boolean;
}

const ok = Test.modelValidate({ flag: 10, name: 'Ada', active: true, extra_field: 'ignore' });
console.log(ok.modelDump());

try {
    const outcome = Test.modelValidate({ flag: '1', name: 'Ada', active: true });
    console.log('expected outcome', outcome.modelDumpJson());
} catch (e) {
    console.log('expected error', e);
}
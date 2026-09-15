import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class Cat extends BaseModel {
    @Field({ literal: 'cat' })
    kind!: 'cat';

    @Field({ type: Boolean })
    indoor!: boolean;
}

@modelConfig({ extra: 'forbid' })
class Dog extends BaseModel {
    @Field({ literal: 'dog' })
    kind!: 'dog';

    @Field({ type: Boolean })
    barks!: boolean;
}

@modelConfig({ extra: 'forbid' })
class PetOwner extends BaseModel {
    @Field({ union: [Cat, Dog], discriminator: 'kind' })
    pet!: Cat | Dog;
}

console.log('union dog', PetOwner.modelValidate({ pet: { kind: 'dog', barks: true } }).modelDump());
console.log('union cat', PetOwner.modelValidate({ pet: { kind: 'cat', indoor: true } }).modelDump());

try {
    PetOwner.modelValidate({ pet: { kind: 'bird', indoor: true } });
    console.log('expected error: validation passed');
} catch (e) {
    console.log('expected error', e instanceof Error ? e.message : e);
}

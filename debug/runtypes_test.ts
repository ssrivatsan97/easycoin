import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';

const HelloMessage = Record({
	type: Literal('hello'),
	version: Template(Literal('0.7.'), Number),
	agent: String
});

export type HelloMessage = Static<typeof HelloMessage>;
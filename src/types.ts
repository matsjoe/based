import { WORD_SIZE } from './mach';

export type Encoding =
	| 'ascii'
	| 'utf8'
	| 'utf-8'
	| 'utf16le'
	| 'ucs2'
	| 'ucs-2'
	| 'base64'
	| 'latin1'
	| 'binary'
	| 'hex'
	| undefined;

export type Char =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z'
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| 'G'
	| 'H'
	| 'I'
	| 'J'
	| 'K'
	| 'L'
	| 'M'
	| 'N'
	| 'O'
	| 'P'
	| 'Q'
	| 'R'
	| 'S'
	| 'T'
	| 'U'
	| 'V'
	| 'W'
	| 'X'
	| 'Y'
	| 'Z'
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9';

export type FieldTypeCode = Char | 'pw';

export const SIZES: { [index: string]: number } = {
	int8: 1,
	int16_be: 2,
	int16_le: 2,
	int32_be: 4,
	int32_le: 4,
	int64_be: 8,
	int64_le: 8,
	uint8: 1,
	uint16_be: 2,
	uint16_le: 2,
	uint32_be: 4,
	uint32_le: 4,
	uint64_be: 8,
	uint64_le: 8,
	float_be: 4,
	float_le: 4,
	double_be: 8,
	double_le: 8,
	cstring_p: 2 * WORD_SIZE,
};

export const TYPES: { [index: string]: FieldTypeCode } = {
	// Fixed size
	int8: 'a',
	int16_be: 'b',
	int16_le: 'c',
	int32_be: 'd',
	int32_le: 'e',
	int64_be: 'f',
	int64_le: 'g',
	uint8: 'h',
	uint16_be: 'i',
	uint16_le: 'j',
	uint32_be: 'k',
	uint32_le: 'l',
	uint64_be: 'm',
	uint64_le: 'n',
	float_be: 'o',
	float_le: 'p',
	double_be: 'q',
	double_le: 'r',
	// Variable size
	int_be: 's',
	int_le: 't',
	uint_be: 'u',
	uint_le: 'v',
	cstring: 'w',
	// Virtual
	record: 'z',
	// Pointer types
	cstring_p: 'pw',
};

export function isPointer(typeCode: FieldTypeCode) {
	return typeCode === 'pw';
}

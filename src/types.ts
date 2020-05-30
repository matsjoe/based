import { ENDIANNESS, WORD_SIZE } from './mach';

/**
 * Encodings accepted by Record read and write operations.
 */
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

/**
 * A list of valid Field Type Codes.
 */
export type FieldTypeCode =
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
	| 'z'
	| 'pw';

/**
 * A map from type names to Field Type Codes.
 */
export const TYPES: { [index: string]: FieldTypeCode } = {
	// Fixed size
	int8: 'a',
	int16: ENDIANNESS === 'BE' ? 'b' : 'c',
	int16_be: 'b',
	int16_le: 'c',
	int32: ENDIANNESS === 'BE' ? 'd' : 'e',
	int32_be: 'd',
	int32_le: 'e',
	int64: ENDIANNESS === 'BE' ? 'f' : 'g',
	int64_be: 'f',
	int64_le: 'g',
	uint8: 'h',
	uint16: ENDIANNESS === 'BE' ? 'i' : 'j',
	uint16_be: 'i',
	uint16_le: 'j',
	uint32: ENDIANNESS === 'BE' ? 'k' : 'l',
	uint32_be: 'k',
	uint32_le: 'l',
	uint64: ENDIANNESS === 'BE' ? 'm' : 'n',
	uint64_be: 'm',
	uint64_le: 'n',
	float: ENDIANNESS === 'BE' ? 'o' : 'p',
	float_be: 'o',
	float_le: 'p',
	double: ENDIANNESS === 'BE' ? 'q' : 'r',
	double_be: 'q',
	double_le: 'r',
	// Variable size
	int: ENDIANNESS === 'BE' ? 's' : 't',
	int_be: 's',
	int_le: 't',
	uint: ENDIANNESS === 'BE' ? 'u' : 'v',
	uint_be: 'u',
	uint_le: 'v',
	cstring: 'w',
	// Virtual
	record: 'z',
	// Pointer types
	cstring_p: 'pw',
};

export const TYPE_CODE2TYPE = new Map(Object.keys(TYPES).map((k) => [TYPES[k], k]));

/**
 * A map from type code to type size.
 */
export const SIZES: { [index: string]: number } = {
	[TYPES.int8]: 1,
	[TYPES.int16_be]: 2, // int16_be
	[TYPES.int16_le]: 2, // int16_le
	[TYPES.int32_be]: 4, // int32_be
	[TYPES.int32_le]: 4, // int32_le
	[TYPES.int64_be]: 8, // int64_be
	[TYPES.int64_le]: 8, // int64_le
	[TYPES.uint8]: 1, // uint8
	[TYPES.uint16_be]: 2, // uint16_be
	[TYPES.uint16_le]: 2, // uint16_le
	[TYPES.uint32_be]: 4, // uint32_be
	[TYPES.uint32_le]: 4, // uint32_le
	[TYPES.uint64_be]: 8, // uint64_be
	[TYPES.uint64_le]: 8, // uint64_le
	[TYPES.float_be]: 4, // float_be
	[TYPES.float_le]: 4, // float_le
	[TYPES.double_be]: 8, // double_be
	[TYPES.double_le]: 8, // double_le
	[TYPES.cstring_p]: 2 * WORD_SIZE, // cstring_p
};

/**
 * Returns a boolean true if the given Field Type Code is a variable type.
 */
export function isVarType(typeCode: FieldTypeCode): boolean {
	return [TYPES.int_be, TYPES.int_le, TYPES.uint_be, TYPES.uint_le, TYPES.cstring].includes(typeCode);
}

/**
 * Returns a boolean true if the given Field Type Code is a virtual type.
 */
export function isVirtualType(typeCode: FieldTypeCode): boolean {
	return typeCode === TYPES.record;
}

/**
 * Returns a boolean true if the given Field Type Code is a pointer type.
 */
export function isPointerType(typeCode: FieldTypeCode): boolean {
	return typeCode === TYPES.cstring_p;
}

/**
 * Map Field Type Codes to C types.
 */
export const C_TYPES = {
	// Fixed size
	[TYPES.int8]: 'int8_t',
	[TYPES.int16_be]: 'int16_t',
	[TYPES.int16_le]: 'int16_t',
	[TYPES.int32_be]: 'int32_t',
	[TYPES.int32_le]: 'int32_t',
	[TYPES.int64_be]: 'int64_t',
	[TYPES.int64_le]: 'int64_t',
	[TYPES.uint8]: 'uint8_t',
	[TYPES.uint16_be]: 'uint16_t',
	[TYPES.uint16_le]: 'uint16_t',
	[TYPES.uint32_be]: 'uint32_t',
	[TYPES.uint32_le]: 'uint32_t',
	[TYPES.uint64_be]: 'uint64_t',
	[TYPES.uint64_le]: 'uint64_t',
	[TYPES.float_be]: 'float',
	[TYPES.float_le]: 'float',
	[TYPES.double_be]: 'double',
	[TYPES.double_le]: 'double',
	// Variable size
	[TYPES.int_be]: 'int8_t',
	[TYPES.int_le]: 'int8_t',
	[TYPES.uint_be]: 'uint8_t',
	[TYPES.uint_le]: 'uint8_t',
	[TYPES.cstring]: 'char',
	// Pointer types
	[TYPES.cstring_p]: 'char *',
};

import { describe, expect, it } from 'vitest'
import { generateKotlin } from './kotlinGenerator'

describe('Kotlin generator', () => {
  it('generates nested data classes and serialization annotations', () => {
    const result = generateKotlin('{"user_id":1,"profile":{"name":"Ada"}}', {
      rootName: 'response', packageName: 'com.example.model', dialect: 'kotlinx',
    })
    expect(result.code).toContain('package com.example.model')
    expect(result.code).toContain('@Serializable')
    expect(result.code).toContain('data class Response')
    expect(result.code).toContain('data class ResponseProfile')
    expect(result.code).toContain('@SerialName("user_id") val userId: Int')
  })

  it('uses nullable and conservative fallback types', () => {
    const result = generateKotlin('{"value":null,"items":[1,"two"]}', {
      rootName: 'Root', packageName: '', dialect: 'none',
    })
    expect(result.code).toContain('val value: Any?')
    expect(result.code).toContain('val items: List<Any?>')
    expect(result.warnings[0]).toContain('异构数组')
  })

  it('handles root arrays, Kotlin keywords and integer boundaries', () => {
    const result = generateKotlin('[{"when":2147483648}]', {
      rootName: 'items', packageName: '', dialect: 'gson',
    })
    expect(result.code).toContain('typealias Items = List<ItemsItem>')
    expect(result.code).toContain('val `when`: Long')
  })

  it('uses Any for empty arrays', () => {
    const result = generateKotlin('{"items":[]}', { rootName: 'Root', packageName: '', dialect: 'moshi' })
    expect(result.code).toContain('List<Any?>')
    expect(result.warnings[0]).toContain('为空')
  })
})

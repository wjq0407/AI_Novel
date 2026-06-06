import Ajv from 'ajv'
import scriptSchema from '../schemas/script.schema.json'

const ajv = new Ajv({ allErrors: true })

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export function validateScript(data: unknown): ValidationResult {
  const validate = ajv.compile(scriptSchema)
  const valid = validate(data)

  if (!valid) {
    const errors = (validate.errors || []).map((err) => {
      const path = err.instancePath || '/'
      return `${path}: ${err.message || '未知错误'}`
    })
    return { valid: false, errors }
  }

  return { valid: true }
}

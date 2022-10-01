export enum BasedErrorCode {
  FunctionError = 50001,
  AuthorizeFunctionError = 50002,
  NoOservableCacheAvailable = 50003,
  ObservableFunctionError = 50004,
  FunctionNotFound = 40401,
  FunctionIsNotObservable = 40402,
  FunctionIsObservable = 40403,
  CannotStreamToObservableFunction = 40402,
  AuthorizeRejectedError = 40301,
  InvalidPayload = 40001,
  PayloadTooLarge = 40002,
  ChunkTooLarge = 40003,
  UnsupportedContentEncoding = 40004,
  LengthRequired = 41101,
  MethodNotAllowed = 40501,
}

const errorDefaults = {
  [BasedErrorCode.FunctionError]: {
    code: 500,
    status: 'Internal Server Error',
    message: ({ name }) => `Error in function${name ? ' ' + name : ''}.`,
  },
  [BasedErrorCode.FunctionNotFound]: {
    code: 404,
    status: 'Not Found',
    message: ({ name }) => `Function${name ? ' ' + name : ''} not found.`,
  },
  [BasedErrorCode.CannotStreamToObservableFunction]: {
    code: 404,
    status: 'Not Found',
    message: 'Cannot stream to observable function.',
  },
  [BasedErrorCode.AuthorizeFunctionError]: {
    code: 403,
    status: 'Forbidden',
    message: 'Error in authorize function',
  },
  [BasedErrorCode.AuthorizeRejectedError]: {
    code: 403,
    status: 'Forbidden',
    message: ({ name }) =>
      `Authorize rejected access${name ? ' to function ' + name : ''}.`,
  },
  [BasedErrorCode.InvalidPayload]: {
    code: 400,
    status: 'Bad Request',
    message: 'Invalid payload.',
  },
  [BasedErrorCode.PayloadTooLarge]: { code: 413, status: 'Payload Too Large' },
  [BasedErrorCode.ChunkTooLarge]: { code: 413, status: 'Payload Too Large' },
  [BasedErrorCode.UnsupportedContentEncoding]: {
    code: 400,
    status: 'Incorrect content encoding',
  },
  [BasedErrorCode.LengthRequired]: { code: 411, status: 'Length Required' },
  [BasedErrorCode.MethodNotAllowed]: {
    code: 405,
    status: 'Method Not Allowed',
  },
  [BasedErrorCode.NoOservableCacheAvailable]: {
    code: 500,
    status: 'Internal Server Error',
    message: ({ name }) =>
      `No observable cache available${name ? ' for function ' + name : ''}.`,
  },
}

export type BasedErrorData = {
  message: string
  basedMessage?: string
  stack: string
  requestId?: number
  observableId?: number
  basedCode: BasedErrorCode
  status?: number
  code?: string
}

export type CreateErrorProps =
  | {
      err?: Error
      name?: string
      observableId?: number
      requestId?: number
    }
  | string

export const createError = (
  basedCode: BasedErrorCode,
  err?: CreateErrorProps
): BasedErrorData => {
  const errorData: BasedErrorData = { message: null, stack: null, basedCode }

  errorData.basedMessage =
    typeof errorDefaults[basedCode]?.message === 'function'
      ? errorDefaults[basedCode]?.message(err)
      : errorDefaults[basedCode]?.message ||
        errorDefaults[basedCode]?.status ||
        'Oops something went wrong'

  if (typeof err === 'string') {
    errorData.message = err
  } else {
    if (err?.err instanceof Error) {
      Object.getOwnPropertyNames(err.err).forEach((key: string) => {
        errorData[key] = err.err[key]
      })
    } else {
      errorData.message = errorData.basedMessage

      const captureTarget = { stack: null }
      Error.captureStackTrace(captureTarget, createError)
      errorData.stack = captureTarget.stack
    }
  }

  if (typeof err !== 'string') {
    if (err?.observableId) {
      errorData.observableId = err.observableId
    }
    if (err?.requestId) {
      errorData.requestId = err.requestId
    }
  }
  errorData.code = errorDefaults[basedCode]?.code
  errorData.status = errorDefaults[basedCode]?.status

  return errorData
}

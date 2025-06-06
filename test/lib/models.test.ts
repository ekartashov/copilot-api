import { test, expect, describe, mock, beforeEach } from "bun:test"
import type { ModelsResponse } from "../../src/services/copilot/get-models"

// Create helper to make mock models
const createMockModel = (id: string) => ({
  id,
  object: "model",
  name: id,
  vendor: "test-vendor",
  version: "1.0",
  model_picker_enabled: true,
  preview: false,
  capabilities: {
    family: "test-family",
    limits: {},
    object: "model_capabilities",
    supports: {},
    tokenizer: "test-tokenizer",
    type: "chat"
  }
})

// Mock getModels service
const mockGetModels = mock((): Promise<ModelsResponse> => Promise.resolve({
  object: "list",
  data: []
}))

mock.module("../../src/services/copilot/get-models", () => ({
  getModels: mockGetModels
}))

// Mock consola
const mockConsola = {
  info: mock(() => {})
}
mock.module("consola", () => ({
  default: mockConsola
}))

// Mock state
const mockState: any = {
  models: undefined
}
mock.module("../../src/lib/state", () => ({
  state: mockState
}))

// Import after mocking
import { cacheModels } from "../../src/lib/models"

describe("cacheModels", () => {
  beforeEach(() => {
    mockGetModels.mockClear()
    mockConsola.info.mockClear()
    mockState.models = undefined
  })

  test("should fetch models and cache them in state", async () => {
    const mockModelsResponse: ModelsResponse = {
      object: "list",
      data: [
        createMockModel("gpt-4"),
        createMockModel("gpt-3.5-turbo")
      ]
    }

    mockGetModels.mockResolvedValueOnce(mockModelsResponse)

    await cacheModels()

    expect(mockGetModels).toHaveBeenCalledTimes(1)
    expect(mockState.models).toEqual(mockModelsResponse)
  })

  test("should log available models information", async () => {
    const mockModelsResponse: ModelsResponse = {
      object: "list",
      data: [
        createMockModel("gpt-4"),
        createMockModel("claude-3"),
        createMockModel("gpt-3.5-turbo")
      ]
    }

    mockGetModels.mockResolvedValueOnce(mockModelsResponse)

    await cacheModels()

    expect(mockConsola.info).toHaveBeenCalledTimes(1)
    expect(mockConsola.info).toHaveBeenCalledWith(
      "Available models: \n- gpt-4\n- claude-3\n- gpt-3.5-turbo"
    )
  })

  test("should handle empty models list", async () => {
    const mockModelsResponse: ModelsResponse = {
      object: "list",
      data: []
    }

    mockGetModels.mockResolvedValueOnce(mockModelsResponse)

    await cacheModels()

    expect(mockState.models).toEqual(mockModelsResponse)
    expect(mockConsola.info).toHaveBeenCalledWith("Available models: \n")
  })

  test("should handle single model", async () => {
    const mockModelsResponse: ModelsResponse = {
      object: "list",
      data: [createMockModel("gpt-4")]
    }

    mockGetModels.mockResolvedValueOnce(mockModelsResponse)

    await cacheModels()

    expect(mockState.models).toEqual(mockModelsResponse)
    expect(mockConsola.info).toHaveBeenCalledWith("Available models: \n- gpt-4")
  })

  test("should propagate errors from getModels", async () => {
    const mockError = new Error("Failed to fetch models")
    mockGetModels.mockRejectedValueOnce(mockError)

    await expect(cacheModels()).rejects.toThrow("Failed to fetch models")
    
    expect(mockState.models).toBeUndefined()
    expect(mockConsola.info).not.toHaveBeenCalled()
  })

  test("should overwrite previous models cache", async () => {
    // Set initial state
    mockState.models = {
      object: "list",
      data: [createMockModel("old-model")]
    }

    const newModelsResponse: ModelsResponse = {
      object: "list",
      data: [
        createMockModel("new-model-1"),
        createMockModel("new-model-2")
      ]
    }

    mockGetModels.mockResolvedValueOnce(newModelsResponse)

    await cacheModels()

    expect(mockState.models).toEqual(newModelsResponse)
    expect(mockState.models.data[0].id).toBe("new-model-1")
  })

  test("should return void", async () => {
    const mockModelsResponse: ModelsResponse = {
      object: "list",
      data: [createMockModel("test-model")]
    }

    mockGetModels.mockResolvedValueOnce(mockModelsResponse)

    const result = await cacheModels()

    expect(result).toBeUndefined()
  })
})
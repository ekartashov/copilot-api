import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test"

import { getVSCodeVersion } from "../../src/services/get-vscode-version"

describe("getVSCodeVersion (isolated from module mocks)", () => {
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response())
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test("should extract version from PKGBUILD response", async () => {
    const mockPkgbuild = `
# Maintainer: D. Can Celasun <dcelasun[at]gmail[dot]com>

pkgname=visual-studio-code-bin
pkgver=1.95.2
pkgrel=1
pkgdesc="Visual Studio Code (binary)"
arch=('x86_64' 'aarch64' 'armv7h')
url="https://code.visualstudio.com/"
license=('custom: commercial')
`

    fetchSpy.mockResolvedValueOnce(
      new Response(mockPkgbuild, {
        status: 200,
      }),
    )

    const result = await getVSCodeVersion()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=visual-studio-code-bin",
    )
    expect(result).toBe("1.95.2")
  })

  test("should return fallback version when no match found", async () => {
    const mockPkgbuild = `
# Maintainer: D. Can Celasun <dcelasun[at]gmail[dot]com>

pkgname=visual-studio-code-bin
# No pkgver line
pkgrel=1
pkgdesc="Visual Studio Code (binary)"
`

    fetchSpy.mockResolvedValueOnce(
      new Response(mockPkgbuild, {
        status: 200,
      }),
    )

    const result = await getVSCodeVersion()

    expect(result).toBe("1.98.1") // FALLBACK value
  })

  test("should return fallback version when pkgver format is invalid", async () => {
    const mockPkgbuild = `
pkgver=invalid-version-format
`

    fetchSpy.mockResolvedValueOnce(
      new Response(mockPkgbuild, {
        status: 200,
      }),
    )

    const result = await getVSCodeVersion()

    expect(result).toBe("1.98.1") // FALLBACK value
  })

  test("should handle fetch errors gracefully", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"))

    await expect(getVSCodeVersion()).rejects.toThrow("Network error")
  })

  test("should handle non-ok response by calling text() anyway", async () => {
    // The current implementation doesn't check response.ok, it just calls .text()
    fetchSpy.mockResolvedValueOnce(
      new Response("error page content", {
        status: 404,
        statusText: "Not Found",
      }),
    )

    const result = await getVSCodeVersion()

    // Since no pkgver pattern will match, it returns fallback
    expect(result).toBe("1.98.1")
  })

  test("should extract only numeric version (regex limitation)", async () => {
    // The regex /pkgver=([0-9.]+)/ only captures numbers and dots
    const mockPkgbuild = `
pkgver=1.95.3.beta.1
`

    fetchSpy.mockResolvedValueOnce(
      new Response(mockPkgbuild, {
        status: 200,
      }),
    )

    const result = await getVSCodeVersion()

    // Only "1.95.3." will be captured due to regex limitation
    expect(result).toBe("1.95.3.")
  })

  test("should handle standard numeric versions", async () => {
    const mockPkgbuild = `
pkgver=1.95.3
`

    fetchSpy.mockResolvedValueOnce(
      new Response(mockPkgbuild, {
        status: 200,
      }),
    )

    const result = await getVSCodeVersion()

    expect(result).toBe("1.95.3")
  })

  test("should handle multiple pkgver lines (extracts first)", async () => {
    const mockPkgbuild = `
pkgver=1.95.1
# comment
pkgver=1.95.2
`

    fetchSpy.mockResolvedValueOnce(
      new Response(mockPkgbuild, {
        status: 200,
      }),
    )

    const result = await getVSCodeVersion()

    expect(result).toBe("1.95.1")
  })

  test("should handle response.text() errors", async () => {
    const mockResponse = new Response("test")
    mockResponse.text = () => Promise.reject(new Error("Text parsing error"))

    fetchSpy.mockResolvedValueOnce(mockResponse)

    await expect(getVSCodeVersion()).rejects.toThrow("Text parsing error")
  })
})

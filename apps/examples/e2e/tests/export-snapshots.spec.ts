import test, { Page, expect } from '@playwright/test'
import { Editor, TLShapeId, TLShapePartial } from '@tldraw/tldraw'
import { assert } from '@tldraw/utils'
import { rename, writeFile } from 'fs/promises'
import { setupPage } from '../shared-e2e'

let page: Page
declare const editor: Editor

// this is currently skipped as we can't enforce it on CI. i'm going to enable it in a follow-up though!
test.describe('Export snapshots', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
	})
	test.beforeEach(async () => {
		await setupPage(page)
	})

	const snapshots = {} as Record<string, TLShapePartial[]>

	for (const fill of ['none', 'semi', 'solid', 'pattern']) {
		snapshots[`geo fill=${fill}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					fill,
					color: 'green',
					w: 100,
					h: 100,
				},
			},
		]

		snapshots[`arrow fill=${fill}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'arrow',
				props: {
					color: 'light-green',
					fill: fill,
					arrowheadStart: 'square',
					arrowheadEnd: 'dot',
					start: { type: 'point', x: 0, y: 0 },
					end: { type: 'point', x: 100, y: 100 },
					bend: 20,
				},
			},
		]

		snapshots[`draw fill=${fill}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'draw',
				props: {
					color: 'light-violet',
					fill: fill,
					segments: [
						{
							type: 'straight',
							points: [{ x: 0, y: 0 }],
						},
						{
							type: 'straight',
							points: [
								{ x: 0, y: 0 },
								{ x: 100, y: 0 },
							],
						},
						{
							type: 'straight',
							points: [
								{ x: 100, y: 0 },
								{ x: 0, y: 100 },
							],
						},
						{
							type: 'straight',
							points: [
								{ x: 0, y: 100 },
								{ x: 100, y: 100 },
							],
						},
						{
							type: 'straight',
							points: [
								{ x: 100, y: 100 },
								{ x: 0, y: 0 },
							],
						},
					],
					isClosed: true,
					isComplete: true,
				},
			},
		]
	}

	for (const font of ['draw', 'sans', 'serif', 'mono']) {
		snapshots[`geo font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'geo',
				props: {
					text: 'test',
					color: 'blue',
					font,
					w: 100,
					h: 100,
				},
			},
		]

		snapshots[`arrow font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'arrow',
				props: {
					color: 'blue',
					fill: 'solid',
					arrowheadStart: 'square',
					arrowheadEnd: 'arrow',
					font,
					start: { type: 'point', x: 0, y: 0 },
					end: { type: 'point', x: 100, y: 100 },
					bend: 20,
					text: 'test',
				},
			},
		]

		snapshots[`arrow font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'arrow',
				props: {
					color: 'blue',
					fill: 'solid',
					arrowheadStart: 'square',
					arrowheadEnd: 'arrow',
					font,
					start: { type: 'point', x: 0, y: 0 },
					end: { type: 'point', x: 100, y: 100 },
					bend: 20,
					text: 'test',
				},
			},
		]

		snapshots[`note font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'note',
				props: {
					color: 'violet',
					font,
					text: 'test',
				},
			},
		]

		snapshots[`text font=${font}`] = [
			{
				id: 'shape:testShape' as TLShapeId,
				type: 'text',
				props: {
					color: 'red',
					font,
					text: 'test',
				},
			},
		]
	}

	for (const [name, shapes] of Object.entries(snapshots)) {
		test(`Exports with ${name}`, async () => {
			await page.evaluate((shapes) => {
				editor
					.updateInstanceState({ exportBackground: false })
					.selectAll()
					.deleteShapes()
					.createShapes(shapes)
			}, shapes)

			const downloadEvent = page.waitForEvent('download')
			await page.click('[data-testid="main.menu"]')
			await page.click('[data-testid="menu-item.edit"]')
			await page.click('[data-testid="menu-item.export-as"]')
			await page.click('[data-testid="menu-item.export-as-svg"]')

			const download = await downloadEvent
			const path = await download.path()
			assert(path)
			await rename(path, path + '.svg')
			await writeFile(
				path + '.html',
				`
                    <!DOCTYPE html>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <img src="${path}.svg" />
                `,
				'utf-8'
			)

			await page.goto(`file://${path}.html`)
			const clip = await page.$eval('img', (img) => img.getBoundingClientRect())
			await expect(page).toHaveScreenshot({
				omitBackground: true,
				clip,
			})
		})
	}
})

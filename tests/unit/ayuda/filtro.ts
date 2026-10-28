import { expect } from 'vitest';
import { ETIQUETA_DEL_FILTRO, type DirectorioFiltrable } from '../../../src/lib/filtroDelDirectorio.ts';

/**
 * Historia 26.6 — lo que el filtro deja en el HTML inicial de un Directorio construido, el mismo
 * juicio para `/autores/` y `/obras/`: sin guion la página tiene que estar entera y sin campo, y
 * la región del recuento tiene que existir antes del primer mensaje.
 *
 *   · entre el `h1` y el listado, el contenedor del filtro, fuera de Pagefind, con la región
 *     `role="status"` vacía y sin `hidden`, y la `/buscar/` del enlace a cero en `data-buscar`;
 *   · ningún `<input>` fuera de un `<template>`: el campo lo inserta el guion;
 *   · la plantilla con la etiqueta visible del Directorio, un `type="search"` sin `placeholder`,
 *     sin botón ni formulario, y un enlace a cero sin `href`;
 *   · nada oculto en el listado: todas las filas, las letras y los «Volver» están a la vista.
 */
export function comprobarFiltroEnElHtml(html: string, directorio: DirectorioFiltrable): void {
  const h1 = html.indexOf('<h1');
  const filtro = html.indexOf(`<div class="filtro" data-filtro="${directorio}"`);
  const listado = html.indexOf('<div class="listado"');
  expect(h1, 'sin h1').toBeGreaterThan(0);
  expect(filtro, 'sin contenedor del filtro').toBeGreaterThan(h1);
  expect(listado, 'el listado no sigue al filtro').toBeGreaterThan(filtro);

  const contenedor = html.slice(filtro, listado);
  expect(contenedor).toMatch(/^<div class="filtro" data-filtro="[a-z]+" data-buscar="\/buscar\/" data-pagefind-ignore="all"/u);

  const regiones = [...html.matchAll(/<p\b[^>]*\brole="status"[^>]*>([\s\S]*?)<\/p>/gu)];
  expect(regiones, 'una sola región de estado').toHaveLength(1);
  expect(regiones[0][0]).toMatch(/^<p class="recuento" role="status"/u);
  expect(regiones[0][1], 'la región no está vacía').toBe('');
  expect(regiones[0][0]).not.toMatch(/\shidden[\s>=]/u);
  expect(contenedor).toContain(regiones[0][0]);

  const plantillas = [...html.matchAll(/<template\b[^>]*>([\s\S]*?)<\/template>/gu)].map((m) => m[1]);
  expect(plantillas).toHaveLength(1);
  const [plantilla] = plantillas;
  expect(contenedor).toContain(plantilla);
  expect(html.replace(/<template\b[\s\S]*?<\/template>/gu, ''), 'un <input> fuera de la plantilla').not.toMatch(/<input\b/u);

  const id = `filtro-de-${directorio}`;
  expect(plantilla).toMatch(new RegExp(`<label for="${id}"[^>]*>${ETIQUETA_DEL_FILTRO[directorio]}</label>`, 'u'));
  expect(plantilla).toMatch(new RegExp(`<input id="${id}" type="search" autocomplete="off"`, 'u'));
  expect(plantilla).not.toContain('placeholder');
  expect(plantilla).not.toMatch(/<button\b|<form\b|\bname=/u);
  const enlaces = [...plantilla.matchAll(/<a\b([^>]*)>/gu)].map((m) => m[1]);
  expect(enlaces).toHaveLength(1);
  expect(enlaces[0], 'el enlace a cero lleva href desde el build').not.toMatch(/\bhref=/u);
  expect(plantilla).toMatch(/<p class="a-cero" data-zona="directorio" hidden/u);

  const delListado = html.slice(listado, html.indexOf('</main>', listado));
  expect(delListado, 'algo del listado sale oculto sin filtrar').not.toMatch(/\shidden[\s>=]/u);
}

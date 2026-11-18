// Все тексты и данные сайта живут в public/content.json.
// Правится либо руками, либо через редактор /tools/editor.html.
// Здесь — только удобные ссылки, чтобы страницы не знали структуру файла.

import data from '../../public/content.json';

export const site = data.site;
export const nav = data.nav;
export const ui = data.ui;
export const home = data.home;
export const servicesPage = data.servicesPage;
export const aboutPage = data.aboutPage;
export const contactPage = data.contactPage;
export const privacyPage = data.privacyPage;
export const notFound = data.notFound;
export const footer = data.footer;
export const services = data.services;
export const steps = data.steps;
export const faq = data.faq;

export const year = new Date().getFullYear();

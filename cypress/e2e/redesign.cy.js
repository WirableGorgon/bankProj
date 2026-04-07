describe('premium dark redesign', () => {
  function login() {
    cy.visit('/');
    cy.contains('Вход в рабочее пространство').should('be.visible');
    cy.get('#log').type('developer');
    cy.get('#pas').type('skillbox');
    cy.contains('button', 'Войти').click();
    cy.location('pathname', { timeout: 10000 }).should('eq', '/accounts-list/');
  }

  function ensureAccountExists() {
    cy.get('body').then(($body) => {
      if (!$body.text().includes('Открыть счет')) {
        cy.contains('button', 'Открыть новый счет').click();
      }
    });

    cy.contains('button', 'Открыть счет', { timeout: 10000 }).should('be.visible');
  }

  it('supports the core desktop flows', () => {
    cy.viewport(1440, 1200);
    login();

    cy.contains('Ваши счета').should('be.visible');
    cy.contains('Каталог счетов').should('be.visible');
    ensureAccountExists();

    cy.contains('button', 'Открыть счет').first().click();
    cy.contains('Новый перевод').should('be.visible');
    cy.contains('Динамика баланса').should('be.visible');
    cy.contains('Последние операции').should('be.visible');
    cy.get('canvas').its('length').should('be.gte', 1);

    cy.contains('button', 'Полная история').click();
    cy.contains('История переводов').should('be.visible');
    cy.contains('Входящий и исходящий поток').should('be.visible');
    cy.get('canvas').its('length').should('be.gte', 2);

    cy.contains('button', 'Валюта').click();
    cy.location('pathname', { timeout: 10000 }).should('eq', '/exchange/');
    cy.contains('Валютный обмен').should('be.visible');
    cy.contains('Обмен валюты').should('be.visible');
    cy.contains('Изменение курсов').should('be.visible');
    cy.get('#cur-from').should('exist');
    cy.get('#cur-to').should('exist');

    cy.contains('button', 'Банкоматы').click();
    cy.location('pathname', { timeout: 10000 }).should('eq', '/map/');
    cy.contains('Карта банкоматов').should('be.visible');
    cy.get('.map-frame').should('exist');
  });

  it('stays usable on a mobile viewport', () => {
    cy.viewport('iphone-xr');
    login();

    cy.contains('Ваши счета').should('be.visible');
    cy.contains('Ключевые показатели').should('be.visible');
    cy.contains('Сортировка и действия').should('be.visible');
    cy.contains('Каталог счетов').should('be.visible');
  });
});

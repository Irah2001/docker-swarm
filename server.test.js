const request = require('supertest');
const app = require('./server');
const os = require('os');

describe('Test des endpoints de l\'API', () => {

    it('GET / doit retourner le hostname en JSON', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toHaveProperty('hostname');
        expect(response.body.hostname).toBe(os.hostname());
    });

    it('GET /health doit retourner un statut OK', async () => {
        const response = await request(app).get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toEqual({ status: 'OK' });
    });
});

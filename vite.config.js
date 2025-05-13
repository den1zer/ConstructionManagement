
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        host: true,
        allowedHosts: [
            'https://c9fd-185-177-188-184.ngrok-free.app',

        ]  },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                register: resolve(__dirname, 'html/registrationPage.html'),
                dashboard: resolve(__dirname, 'html/mainPage.html'),
                addProject: resolve(__dirname, 'html/addProject.html'),
                addWorker: resolve(__dirname, 'html/addWorker.html'),
                projectDetails: resolve(__dirname, 'html/projectDetails.html'),
                taskPlanner: resolve(__dirname, 'html/taskPlanner.html')
            },
        },
    },
})
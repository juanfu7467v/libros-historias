/**
 * returnConfig.js
 * Centraliza la lógica para el manejo de redirecciones y parámetros return_to.
 * Adaptado para Supabase Auth.
 */

const ReturnConfig = {
    /**
     * Obtiene un parámetro de la URL por su nombre.
     * @param {string} name - Nombre del parámetro.
     * @returns {string|null} - Valor del parámetro o null si no existe.
     */
    getUrlParameter: function(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    /**
     * Obtiene la ruta de retorno válida (return_to) priorizando la URL y luego el sessionStorage.
     * @returns {string|null} - La ruta de retorno decodificada o null.
     */
    getReturnPath: function() {
        let returnTo = this.getUrlParameter('return_to');
        
        if (!returnTo || returnTo === 'null' || returnTo === 'undefined') {
            returnTo = sessionStorage.getItem('return_to');
        }

        if (returnTo) {
            try {
                const decodedUrl = decodeURIComponent(returnTo);
                // Validar que sea una ruta relativa para evitar redirecciones abiertas (Open Redirect)
                if (decodedUrl.startsWith('/') && !decodedUrl.includes('//')) {
                    return decodedUrl;
                }
            } catch (e) {
                console.warn('URL de retorno inválida:', e);
            }
        }
        return null;
    },

    /**
     * Guarda el parámetro return_to de la URL en el sessionStorage si existe.
     */
    saveReturnToSession: function() {
        const returnTo = this.getUrlParameter('return_to');
        if (returnTo && returnTo !== 'null' && returnTo !== 'undefined') {
            sessionStorage.setItem('return_to', returnTo);
        }
    },

    /**
     * Limpia el parámetro return_to del sessionStorage.
     */
    clearReturnToSession: function() {
        sessionStorage.removeItem('return_to');
    },

    /**
     * Ejecuta la redirección después de la autenticación.
     * @param {Object} session - Objeto de sesión de Supabase.
     * @param {string} defaultPath - Ruta por defecto si no hay return_to.
     */
    redirectAfterAuth: function(session, defaultPath = '/mis-historias') {
        const returnPath = this.getReturnPath();
        if (returnPath) {
            this.clearReturnToSession();
            window.location.href = returnPath;
        } else {
            window.location.href = defaultPath;
        }
    },

    /**
     * Redirige al login incluyendo la ruta actual como return_to.
     */
    redirectToLogin: function() {
        // Aseguramos que la ruta comience con / para que login.html la acepte como relativa
        let currentPath = window.location.pathname + window.location.search;
        if (!currentPath.startsWith('/')) {
            currentPath = '/' + currentPath;
        }
        window.location.href = "/login.html?return_to=" + encodeURIComponent(currentPath);
    },

    /**
     * Verifica si el usuario está autenticado (Lado Cliente).
     * Si no lo está, redirige al login.
     */
    checkAuth: async function(supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            this.redirectToLogin();
            return null;
        }
        return session;
    }
};

// Exportar para uso en módulos si es necesario, o dejar disponible globalmente
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReturnConfig;
}

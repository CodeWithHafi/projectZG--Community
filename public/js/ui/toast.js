/**
 * Toast Notification System
 * Usage:
 *   1. Include toast.css in your HTML
 *   2. Include this script
 *   3. Add: <div id="toast-container" class="toast-container"></div>
 *   4. Call: Toast.success('Message'), Toast.error('Message'), etc.
 */
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-[420px] md:top-2.5 md:left-2.5 md:right-2.5';
            document.body.appendChild(this.container);
        }
    },

    show(options) {
        if (!this.container) this.init();

        const { type = 'info', title, message, duration = 4000 } = options;
        const icons = { success: 'fa-check', error: 'fa-times', warning: 'fa-exclamation', info: 'fa-info' };
        const titles = { success: 'Success!', error: 'Error!', warning: 'Warning!', info: 'Info' };

        // Type-specific styles (Icon BG & Progress BG)
        const typeStyles = {
            success: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            error: 'bg-gradient-to-br from-red-500 to-red-600',
            warning: 'bg-gradient-to-br from-amber-500 to-amber-600',
            info: 'bg-gradient-to-br from-blue-500 to-blue-600'
        };
        const progressStyles = {
            success: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
            error: 'bg-gradient-to-r from-red-500 to-red-600',
            warning: 'bg-gradient-to-r from-amber-500 to-amber-600',
            info: 'bg-gradient-to-r from-blue-500 to-blue-600'
        };

        const toast = document.createElement('div');
        toast.className = `flex items-center gap-3 p-4 px-5 rounded-xl bg-white shadow-xl ring-1 ring-black/5 min-w-[320px] max-w-[420px] translate-x-[120%] opacity-0 animate-[toastSlideIn_0.5s_cubic-bezier(0.68,-0.55,0.265,1.55)_forwards] relative overflow-hidden`;

        const icon = document.createElement('div');
        icon.className = `w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white ${typeStyles[type]}`;
        icon.innerHTML = `<i class="fas ${icons[type]}"></i>`;

        const content = document.createElement('div');
        content.className = 'flex-1';

        const titleEl = document.createElement('div');
        titleEl.className = 'font-bold text-sm text-gray-800 mb-0.5';
        titleEl.textContent = title || titles[type];

        const messageEl = document.createElement('div');
        messageEl.className = 'text-[13px] text-gray-500 leading-snug';
        messageEl.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'bg-transparent border-none text-gray-400 cursor-pointer p-1 rounded-md transition-all duration-200 shrink-0 hover:bg-gray-100 hover:text-gray-700';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';

        const progress = document.createElement('div');
        progress.className = `absolute bottom-0 left-0 h-[3px] rounded-b-xl ${progressStyles[type]} animate-[toastProgress_linear_forwards]`;
        progress.style.animationDuration = `${duration}ms`;

        content.appendChild(titleEl);
        content.appendChild(messageEl);
        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(closeBtn);
        toast.appendChild(progress);

        toast.querySelector('button').onclick = () => this.close(toast);
        this.container.appendChild(toast);

        // Auto-close
        setTimeout(() => this.close(toast), duration);

        return toast;
    },

    close(toast) {
        if (toast && !toast.getAttribute('data-closing')) {
            toast.setAttribute('data-closing', 'true');
            toast.classList.remove('animate-[toastSlideIn_0.5s_cubic-bezier(0.68,-0.55,0.265,1.55)_forwards]');
            toast.classList.add('animate-[toastSlideOut_0.4s_cubic-bezier(0.68,-0.55,0.265,1.55)_forwards]');

            setTimeout(() => toast.remove(), 400);
        }
    },

    success(message, title) { return this.show({ type: 'success', title, message }); },
    error(message, title) { return this.show({ type: 'error', title, message }); },
    warning(message, title) { return this.show({ type: 'warning', title, message }); },
    info(message, title) { return this.show({ type: 'info', title, message }); }
};

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => Toast.init());

import subprocess
import sys
import os


def main():
    backend = subprocess.Popen([sys.executable, os.path.join('backend', 'app.py')])
    frontend = subprocess.Popen([
        sys.executable,
        '-m',
        'http.server',
        '8000',
        '--directory',
        'frontend'
    ])
    try:
        backend.wait()
    except KeyboardInterrupt:
        pass
    finally:
        for proc in (backend, frontend):
            try:
                proc.terminate()
            except Exception:
                pass


if __name__ == '__main__':
    main()

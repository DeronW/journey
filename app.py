import datetime
from flask import Flask, jsonify, send_from_directory
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = datetime.timedelta(-1)


def fail(errmsg=None):
    return jsonify({'success': False, 'data': None, 'errmsg': errmsg})


def success(data=None):
    return jsonify({'success': True, 'data': data, 'errmsg': None})


@app.route('/static/<path:filename>')
def download_file(filename):
    return send_from_directory('static', filename, as_attachment=True)


# @app.before_request
# def before(**args):
#     print(args)

# @app.after_request
# def after(**args):
#     print(args)


@app.route('/')
def hello():
    return '[ %s ] ok' % datetime.datetime.now()


if __name__ == '__main__':
    app.config['DEBUG'] = True
    app.logger.info('Server Started!')
    app.run(host='0.0.0.0', port=5000)
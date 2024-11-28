import os
import cmd
import shutil
import stat
import platform
import time

# Only import pwd and grp on Unix systems
if platform.system() != 'Windows':
    import pwd
    import grp

class FakeShell(cmd.Cmd):
    prompt = 'fake-rhel> '  # Simulates the Red Hat prompt
    intro = (
        "=============================\n"
        " Welcome to the Fake Red Hat Linux Shell!\n"
        " Type 'help' to list commands.\n"
        "=============================\n"
    )

    def preloop(self):
        """Print a startup message when the shell starts."""
        print("Fake Red Hat Linux environment is now running...")

    def do_ls(self, arg):
        """List directory contents (ls). Usage: ls [path]"""
        path = arg if arg else '.'
        try:
            files = os.listdir(path)
            if not files:
                print("Directory is empty.")
            else:
                for file in files:
                    print(file)
        except FileNotFoundError:
            print(f"No such directory: {path}")
        except Exception as e:
            print(f"Error: {str(e)}")

    def do_pwd(self, arg):
        """Print the current working directory (pwd)."""
        print(os.getcwd())

    def do_cd(self, arg):
        """Change the current directory (cd). Usage: cd <directory>"""
        if arg:
            try:
                os.chdir(arg)
            except FileNotFoundError:
                print(f"No such directory: {arg}")
            except NotADirectoryError:
                print(f"{arg} is not a directory.")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No directory specified")

    def do_tree(self, arg):
        """List contents of directories in a tree-like format (tree). Usage: tree [path]"""
        path = arg if arg else '.'
        for root, dirs, files in os.walk(path):
            level = root.replace(path, '').count(os.sep)
            indent = ' ' * 4 * level
            print(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 4 * (level + 1)
            for file in files:
                print(f"{subindent}{file}")

    def do_mkdir(self, arg):
        """Create a directory (mkdir). Usage: mkdir <directory>"""
        if arg:
            try:
                os.mkdir(arg)
                print(f"Directory '{arg}' created.")
            except FileExistsError:
                print(f"Directory '{arg}' already exists.")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No directory name specified")

    def do_rmdir(self, arg):
        """Remove an empty directory (rmdir). Usage: rmdir <directory>"""
        if arg:
            try:
                os.rmdir(arg)
                print(f"Directory '{arg}' removed.")
            except FileNotFoundError:
                print(f"No such directory: {arg}")
            except OSError:
                print(f"Directory '{arg}' is not empty or can't be removed.")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No directory name specified")

    def do_rm(self, arg):
        """Remove a file (rm). Usage: rm <file>"""
        if arg:
            try:
                os.remove(arg)
                print(f"File '{arg}' removed.")
            except FileNotFoundError:
                print(f"No such file: {arg}")
            except IsADirectoryError:
                print(f"{arg} is a directory (use 'rmdir' or 'rm -r').")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No file specified")

    def do_cp(self, arg):
        """Copy files (cp). Usage: cp <source> <destination>"""
        args = arg.split()
        if len(args) < 2:
            print("Usage: cp <source> <destination>")
        else:
            src, dst = args[0], args[1]
            try:
                shutil.copy(src, dst)
                print(f"Copied {src} to {dst}")
            except FileNotFoundError:
                print(f"File {src} not found.")
            except Exception as e:
                print(f"Error: {str(e)}")

    def do_mv(self, arg):
        """Move/rename files (mv). Usage: mv <source> <destination>"""
        args = arg.split()
        if len(args) < 2:
            print("Usage: mv <source> <destination>")
        else:
            src, dst = args[0], args[1]
            try:
                shutil.move(src, dst)
                print(f"Moved {src} to {dst}")
            except FileNotFoundError:
                print(f"File {src} not found.")
            except Exception as e:
                print(f"Error: {str(e)}")

    def do_stat(self, arg):
        """Display file or directory information (stat). Usage: stat <file>"""
        if arg:
            try:
                file_stat = os.stat(arg)
                print(f"File: {arg}")
                print(f"Size: {file_stat.st_size} bytes")
                print(f"Permissions: {stat.filemode(file_stat.st_mode)}")
                print(f"Last modified: {time.ctime(file_stat.st_mtime)}")
            except FileNotFoundError:
                print(f"No such file: {arg}")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No file specified")

    def do_chmod(self, arg):
        """Change file permissions (chmod). Usage: chmod <permissions> <file>"""
        args = arg.split()
        if len(args) != 2:
            print("Usage: chmod <permissions> <file>")
        else:
            mode, file = args[0], args[1]
            try:
                os.chmod(file, int(mode, 8))
                print(f"Changed permissions of {file} to {mode}")
            except FileNotFoundError:
                print(f"No such file: {file}")
            except Exception as e:
                print(f"Error: {str(e)}")

    def do_chown(self, arg):
        """Change file owner and group (chown). Usage: chown <user> <group> <file>"""
        if platform.system() == 'Windows':
            print("chown is not supported on Windows")
            return
        
        args = arg.split()
        if len(args) != 3:
            print("Usage: chown <user> <group> <file>")
        else:
            user, group, file = args[0], args[1], args[2]
            try:
                uid = pwd.getpwnam(user).pw_uid
                gid = grp.getgrnam(group).gr_gid
                os.chown(file, uid, gid)
                print(f"Changed ownership of {file} to {user}:{group}")
            except FileNotFoundError:
                print(f"No such file: {file}")
            except KeyError:
                print(f"Invalid user/group: {user}/{group}")
            except Exception as e:
                print(f"Error: {str(e)}")

    def do_find(self, arg):
        """Find files in a directory (find). Usage: find [path]"""
        path = arg if arg else '.'
        for root, dirs, files in os.walk(path):
            for file in files:
                print(os.path.join(root, file))

    def do_touch(self, arg):
        """Create an empty file (touch). Usage: touch <file>"""
        if arg:
            try:
                with open(arg, 'a'):
                    os.utime(arg, None)
                print(f"File '{arg}' created.")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No file name specified")

    def do_cat(self, arg):
        """Display the content of a file (cat). Usage: cat <file>"""
        if arg:
            try:
                with open(arg, 'r') as file:
                    print(file.read())
            except FileNotFoundError:
                print(f"No such file: {arg}")
            except IsADirectoryError:
                print(f"{arg} is a directory.")
            except Exception as e:
                print(f"Error: {str(e)}")
        else:
            print("No file specified")

    def do_clear(self, arg):
        """Clear the screen (clear)."""
        os.system('cls' if os.name == 'nt' else 'clear')

    def do_exit(self, arg):
        """Exit the fake shell (exit)."""
        print("Exiting shell.")
        return True

    def default(self, line):
        """Handles unrecognized commands."""
        print(f"Unrecognized command: {line}. Type 'help' for a list of commands.")

    def do_help(self, arg):
        """List available commands or provide help on a specific command."""
        if arg:
            cmd_obj = self.get_names()
            if arg in cmd_obj:
                print(f"{arg} - {self.do_ls.__doc__}")
            else:
                print(f"No help available for {arg}")
        else:
            print("Available commands:")
            for cmd in sorted(self.get_names()):
                print(f"  {cmd}")

    def get_names(self):
        """Override the get_names method to include built-in commands."""
        return super().get_names() + ['ls', 'pwd', 'cd', 'tree', 'mkdir', 
                                       'rmdir', 'rm', 'cp', 'mv', 'stat', 
                                       'chmod', 'chown', 'find', 'touch', 
                                       'cat', 'clear', 'exit', 'help']

if __name__ == '__main__':
    FakeShell().cmdloop()
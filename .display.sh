#!/bin/sh
# Shared by every subproject's .env.lua via oslo.source(...). One copy, so the Wayland/NVIDIA
# detection that used to live in ~/.config/direnv/direnvrc's use_nvidia/use_display cannot drift
# between the 19 checkouts that all called it the same way through their .envrc.

_robolibs_use_nvidia() {
    export __NV_PRIME_RENDER_OFFLOAD=1
    export __NV_PRIME_RENDER_OFFLOAD_PROVIDER=NVIDIA-G0
    export __GLX_VENDOR_LIBRARY_NAME=nvidia
    export __VK_LAYER_NV_optimus=NVIDIA_only

    # Snapshot the running NVIDIA driver version for flakes that need to read
    # it through `builtins.getEnv` under `--impure`.
    if [ -r /proc/driver/nvidia/version ]; then
        export NVIDIA_VERSION="$(head -n1 /proc/driver/nvidia/version \
            | sed -nE 's/.*  ([0-9.]+)  Release.*/\1/p')"
    fi
}

_robolibs_use_display() {
    export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

    # Resolve relative Wayland names under XDG_RUNTIME_DIR while also
    # accepting absolute socket paths allowed by the Wayland protocol.
    local wl_socket_path=""
    case "${WL_SOCKET:-}" in
        /*) wl_socket_path="$WL_SOCKET" ;;
        ?*) wl_socket_path="$XDG_RUNTIME_DIR/$WL_SOCKET" ;;
    esac

    # Reject stale display variables inherited through SSH or terminal
    # multiplexers.
    if [ -z "$wl_socket_path" ] || [ ! -S "$wl_socket_path" ]; then
        local display_socket_path=""
        case "${WAYLAND_DISPLAY:-}" in
            /*) display_socket_path="$WAYLAND_DISPLAY" ;;
            ?*) display_socket_path="$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ;;
        esac

        if [ -n "$display_socket_path" ] && [ -S "$display_socket_path" ]; then
            export WL_SOCKET="$WAYLAND_DISPLAY"
            wl_socket_path="$display_socket_path"
        else
            # Recover the newest live Waypipe server display, for a shell spawned by a
            # persistent multiplexer daemon that cannot inherit the attaching client's env.
            local waypipe_display
            waypipe_display="$(
                ps -u "$(id -u)" -C waypipe -o pid=,args= 2>/dev/null \
                    | sed -n 's/^[[:space:]]*[0-9][0-9]*[[:space:]].*--display[[:space:]][[:space:]]*\([^[:space:]]*\).*server[[:space:]]*$/\1/p' \
                    | tail -n 1
            )"

            if [ -n "$waypipe_display" ] && [ -S "$XDG_RUNTIME_DIR/$waypipe_display" ]; then
                export WAYLAND_DISPLAY="$waypipe_display"
                export WL_SOCKET="$waypipe_display"
                wl_socket_path="$XDG_RUNTIME_DIR/$waypipe_display"
            else
                export WL_SOCKET="wayland-0"
                wl_socket_path="$XDG_RUNTIME_DIR/$WL_SOCKET"
            fi
        fi
    fi

    # Prefer native Wayland only when the resolved socket exists; otherwise use X11/XWayland.
    # Override before this loads with BACKEND=x11/wayland.
    if [ -z "${BACKEND:-}" ]; then
        if [ -S "$wl_socket_path" ]; then
            export BACKEND="wayland"
        else
            export BACKEND="x11"
        fi
    fi

    export RUN_WITH="${RUN_WITH:-nixVulkan}"

    if [ "$BACKEND" = "wayland" ]; then
        unset WAYLAND_SOCKET
        export WAYLAND_DISPLAY="$WL_SOCKET"
        unset DISPLAY
    else
        unset WAYLAND_DISPLAY
        unset WAYLAND_SOCKET
        export DISPLAY="${DISPLAY:-:1}"
    fi
}

if ! _robolibs_use_nvidia; then
    unset NVIDIA_VERSION
    echo "robolibs: NVIDIA driver not detected; using nixGLIntel/nixVulkanIntel fallback"
fi
_robolibs_use_display

unset -f _robolibs_use_nvidia _robolibs_use_display

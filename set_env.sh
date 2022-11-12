#!/bin/bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-11.jdk/Contents/Home
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk

export PATH=$JAVA_HOME/bin:$PATH
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools

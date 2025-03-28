<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('nankas', function (Blueprint $table) {
            $table->id(); // 自動インクリメントのID
            $table->string('name'); // 名前
            $table->string('email')->unique(); // 一意なメールアドレス
            $table->timestamps(); // 作成日と更新日を記録するカラム
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nankas');
    }
};
